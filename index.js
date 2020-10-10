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
      sendMsg(ctx, `Привет, <b>${candidate.username}</b>!`, [["Создать комнату", "Вступить в комнату", "О игре"]])
    } else if (msg == "о игре") {
      sendMsg(ctx, `
Создатель: Degreet
Игра: Лото.
Правила игры Вы можете почитать в интернете.
      `, toMenuMarkup)
    } else {
      sendMsg(ctx, 'Неизвестная команда', toMenuMarkup)
    }
  } else {
    sendMsg(ctx, `Ваш аккаунт не найден. Чтобы создать новый аккаунт, введите /start.`)
  }
})

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

  bot.launch()
})