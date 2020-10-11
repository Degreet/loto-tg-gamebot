const Scene = require("telegraf/scenes/base")
const Extra = require("telegraf/extra")
const Markup = require("telegraf/markup")

class SceneGen {
  registration() {
    const reg = new Scene("reg")

    reg.enter(ctx => {
      sendMsg(ctx, `Как тебя зовут? Придумай себе уникальный логин, и напиши его мне!`)
    })

    reg.on("message", async ctx => {
      const username = ctx.message.text
      const userId = ctx.from.id
      const candidate = await getCandidate({ username })

      if (candidate) {
        sendMsg(ctx, `Логин <b>${username}</b> уже занят. Попробуйте другой.`)
      } else {
        sendMsg(ctx, `<b>${username}</b>, Вы были успешно зарегистрированы!`)

        await users.insertOne({
          userId,
          username
        })

        sendMsg(ctx, "Чтобы продолжить, введите /menu.")
        ctx.scene.leave()
      }
    })

    return reg
  }

  joinToRoom() {
    const joinToRoom = new Scene("joinToRoom")

    joinToRoom.enter(ctx => {
      sendMsg(ctx, `Введите код комнаты, или введите /exit, чтобы вернутся.`)
    })

    joinToRoom.on("message", async ctx => {
      const userId = ctx.from.id
      const msg = ctx.message.text.toLowerCase()
      const candidate = await getCandidate({ userId })

      if (msg == "/exit" || msg == "покинуть комнату") {
        const room = await getRoom(candidate.inRoom)
        const members = await users.find({ inRoom: candidate.inRoom }).toArray()

        await users.updateOne({ userId }, {
          $set: {
            inRoom: false,
            roomRole: null
          }
        })

        mainBot.telegram.sendMessage(room.author.userId,
          `Игрок "${candidate.username}" покинул комнату. ${members.length - 1}/10`)
        sendMsg(ctx, `Вы успешно покинули комнату.`, ["Вернутся в меню"])
        ctx.scene.leave()
      } else {
        if (!candidate.inRoom) {
          const code = msg.toUpperCase()
          const room = await getRoom(code)

          if (room) {
            const members = await users.find({ inRoom: code }).toArray()

            if (members.length < 10) {
              mainBot.telegram.sendMessage(room.author.userId,
                `Новый участник: ${candidate.username}. ${members.length + 1}/10`)

              await users.updateOne({ _id: candidate._id }, {
                $set: {
                  inRoom: code,
                  roomRole: "member"
                }
              })

              sendMsg(ctx, `
Вы успешно подключились к комнате <b>${code}</b>!
Ваша роль: <b>Участник</b>
Другие участники: <b>${buildMembersList(members).join(", ")}</b>
            `, ["Покинуть комнату"])
            } else {
              sendMsg(ctx, `Комната переполнена.`)
            }
          } else {
            sendMsg(ctx, `Неверный код комнаты.`)
          }
        }
      }
    })

    return joinToRoom
  }
}

function buildMembersList(members) {
  const res = []
  members.forEach(member => res.push(member.username))
  return res
}

async function getRoom(id) {
  return await rooms.findOne({ roomCode: id })
}

async function getCandidate(data) {
  const { userId, username } = data
  return await users.findOne(userId ? { userId } : username ? { username } : { userId: "dsahfiuo3189hnsak" })
}

function sendMsg(ctx, text, markup = []) {
  return ctx.replyWithHTML(text, setMarkup(markup))
}

function setMarkup(markup) {
  return Markup.keyboard(markup).oneTime().resize().extra();
}

module.exports = SceneGen