import Bot from 'messenger-bot'
import { subscribeChatbots } from './actions'
import { writeSpeech } from './speech'
import * as botEvents from './events'
import * as botConfig from '../bot/config'

class Factory {
  constructor () {
    this.globalState = {}
    this.observer = subscribeChatbots()
      .subscribe({
        next: this.next.bind(this),
        error: this.error.bind(this)
      })
  }

  next ({ data }) {
    console.info('--- receiving notification of subscription!'.blue)
    // TODO: a todo momento em que acontece uma inclusão, atualização em qualquer
    // atributo ou query relacionada a chabots esse evento é disparado.
    data.chatbots.forEach((chatbot) => {
      if (chatbot.chatbot_settings.length > 0 && chatbot.chatbot_campaigns.length > 0) {
        this.globalState[chatbot.id] = {
          speech: this.handleNextSpeech(chatbot),
          settings: this.handleNextSettings(chatbot)
        }
      } else {
        console.error(`--- ${chatbot.name} has no settings or campaigns!`.red)
      }
    })
  }

  error (err) {
    console.error('--- receiving error of subscription: ', err)
  }

  handleNextSettings ({ name, chatbot_settings: chatbotSettings }) {
    // so far only expected to set up Facebook
    const { settings } = chatbotSettings[0]
    return {
      app_secret: settings.messenger_app_secret,
      token: settings.messenger_page_access_token,
      verify: settings.messenger_validation_token
    }
  }

  handleNextSpeech ({ name, chatbot_campaigns: chatbotCampaigns }) {
    // TODO: Criar uma seleção configuravel
    const conversation = JSON.parse(chatbotCampaigns[0].diagram)
    const speech = writeSpeech(conversation)
    // Change speech list to messages object
    const messages = {}
    speech.forEach(node => {
      Object.keys(node).forEach(key => {
        messages[key] = node[key]
      })
    })
    // TODO: Criar flag para identificar get_started
    return {
      messages,
      started: conversation.nodes[0].id
    }
  }

  fabricate () {
    const chatbots = Object.keys(this.globalState)
    return Promise.all(chatbots.map(chatbotId => {
      const chatbot = this.globalState[chatbotId]

      // Validate and settings messenger-bot
      const settings = botConfig.validate(chatbot.settings)
      const bot = new Bot(settings)
      // TODO: configure facebook settings data
      const data = {
        pressure: {
          slug: 'abortemesseabsurdo',
          widget_id: 21044
        },
        image_url: 'https://s3.amazonaws.com/chatbox-beta/pec29/share-pec29.jpg',
        name: 'BETA',
        m_me: 'https://m.me/beta.feminista'
      }
      const botData = { ...settings, data }

      // Configure started button and persistent menu
      bot.setGetStartedButton({ payload: chatbot.speech.started })
      // bot.setPersistentMenu([speech.messages.PERSISTENT_MENU])

      // Configure events
      const eventArgs = [
        bot,
        () => {
          const chatbot = this.globalState[chatbotId]
          return { version: 'v2', messages: chatbot.speech.messages }
        },
        botData
      ]
      bot.on('error', (err) => {
        console.error(`--- ${chatbot.name} bot error: `.red, err)
      })
      bot.on('message', botEvents.message(...eventArgs))
      bot.on('postback', botEvents.postback(...eventArgs))

      return { bot, botData, id: chatbotId }
    }))
  }
}

/*
[PERSISTENT_MENU]: {
  locale: 'default',
  composer_input_disabled: false,
  call_to_actions: [
    {
      title: 'Parem a PEC 29!',
      type: 'postback',
      payload: V2_QUICK_REPLY_O_1
    },
    {
      title: 'Outras Ações',
      type: 'postback',
      payload: V2_QUICK_REPLY_ACT
    },
    {
      title: 'Mais sobre a Beta',
      type: 'postback',
      payload: V2_QUICK_REPLY_MAIS
    }
  ]
},

[GET_STARTED]: {
  text: botSpeeches.messages.I_AM_BETA,
  quick_replies: [
    quickReply(V2_QUICK_REPLY_A, botSpeeches.buttonTexts.LETS_GO)
  ]
}
*/

export default Factory
