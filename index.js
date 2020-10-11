const { Telegraf } = require("telegraf")
const Extra = require("telegraf/extra")
const Markup = require("telegraf/markup")
const { Stage, session } = Telegraf
const SceneGen = require("./Scenes")

const dotenv = require("dotenv")
dotenv.config()

const KEY = process.env.KEY
const { MongoClient, ObjectId } = require("mongodb")
const uri = `mongodb+srv://Node:${KEY}@cluster0-ttfss.mongodb.net/loto-tg-bot?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })

const TOKEN = process.env.TOKEN
const bot = new Telegraf(TOKEN)
const toMenuMarkup = ["Вернутся в меню"]

const curScenes = new SceneGen()
const regScene = curScenes.registration()
const stage = new Stage([regScene])
bot.use(session())
bot.use(stage.middleware())

const adminToken = process.env.ADMIN_TOKEN
const admin = new Telegraf(adminToken)

admin.on("message", async ctx => {
  const msg = ctx.message.text.toLowerCase()
  const userId = ctx.from.id

  if (userId == 582824629) {
    if (msg == "/clearServer") {
      await rooms.deleteMany({})
      sendMsg(ctx, `Успешно сделано!`)
    }
  }
})

bot.command("start", async ctx => {
  const userId = ctx.from.id
  const candidate = await getCandidate({ userId })

  if (candidate) {
    const username = candidate.username
    sendMsg(ctx, `С возвращением, <>${username}</>!`)
  } else {
    sendMsg(ctx, `Привет, новичок!`)
    ctx.scene.enter("reg")
  }
})

bot.on("message", async ctx => {
  const msg = ctx.message.text.toLowerCase()
  const userId = ctx.from.id
  const candidate = await getCandidate({ userId })

  if (candidate) {
    if (msg == "/menu" || msg == "вернутся в меню") {
      checkInRoom(ctx, candidate, () => {
        sendMsg(ctx,
          `Привет, <b>${candidate.username}</b>!`,
          [["Создать комнату", "Вступить в комнату", "О игре"]])
      })
    } else if (msg == "о игре") {
      sendMsg(ctx, `
Создатель: Degreet
Игра: Лото.
Правила игры Вы можете почитать в интернете.
      `, toMenuMarkup)
    } else if (msg == "создать комнату") {
      checkInRoom(ctx, candidate, async () => {
        const roomCode = (await getRoomCode()).toUpperCase()

        if (roomCode == "error") {
          sendMsg(ctx, `Сервера переполнены, попробуйте позже.`)
        } else {
          const started = getDate()

          await rooms.insertOne({
            roomCode,
            author: candidate,
            started,
            members: 1,
          })

          await users.updateOne({ _id: candidate._id }, {
            $set: {
              inRoom: roomCode,
              roomRole: "admin"
            }
          })

          sendMsg(ctx, `
Ваша комната создана!
Администратор: <b>${candidate.username}</b>,
Код комнаты: <b>${roomCode}</b>
        `, [["Начать игру", "Удалить комнату"]])
        }
      })
    } else if (msg == "удалить комнату") {
      const roomCode = candidate.inRoom

      if (roomCode) {
        if (candidate.roomRole == "admin") {
          const candidates = await users.find({ inRoom: roomCode }).toArray()
          candidates.forEach(async cand => {
            await users.updateOne({ _id: cand._id }, {
              $set: {
                inRoom: false,
                roomRole: null
              }
            })
          })
          sendMsg(ctx, `Вы успешно удалили комнату!`, toMenuMarkup)
        } else {
          sendMsg(ctx, `Вы не являетесь администратором комнаты.`)
        }
      } else {
        sendMsg(ctx, `Вы не находитесь в комнате.`)
      }
    } else {
      sendMsg(ctx, 'Неизвестная команда', toMenuMarkup)
    }
  } else {
    sendMsg(ctx, `Ваш аккаунт не найден. Чтобы создать новый аккаунт, введите /start.`)
  }
})

function checkInRoom(ctx, candidate, ifNo) {
  if (!candidate.inRoom) {
    ifNo()
  } else {
    sendMsg(ctx, `Нельзя совершить данное действие, пока вы находитесь в комнате.`)
  }
}

function getDate() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

function rnd(min, max) {
  return Math.floor(Math.random() * (max - min) + min)
}

async function getRoomCode() {
  let res
  let fails = 0

  do {
    res = genRoomCode()
    fails++
    if (fails > 100) return "error"
  } while ((await rooms.findOne({ res })))

  return res
}

function genRoomCode() {
  let res = ""
  const chars = "qwertyuopasdfghjklzxcvbnm"
  for (let i = 0; i < 6; i++) res += chars[rnd(0, chars.length)]
  return res
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

client.connect(err => {
  if (err) console.log(err)

  global.users = client.db("loto-tg-bot").collection("users")
  global.rooms = client.db("loto-tg-bot").collection("rooms")

  bot.launch()
})