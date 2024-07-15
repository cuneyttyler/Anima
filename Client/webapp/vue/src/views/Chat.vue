<template>
    <div id="chat">
      <div class="router">
        <router-link to="/">Home</router-link>
        <hr>
      </div>

      <div class="chat-inner">
        <CharacterList :characters="characters" :page="page" @add-character="addCharacter" :key="listKey"/>
        
        <div class="session-type">
          <select v-model="selectedType">
            <option value="0">Normal</option>
            <option value="1">N2N</option>
            <option value="2">Broadcast</option>
          </select>
        </div>
        <div class="session" v-if="sessionCharacters.length > 0">
          <b>Session</b>
          <hr>
          <div class="inner">
            <div class="session-list">
              <table>
                <tr>
                    <th>Name</th>
                    <th>==</th>
                </tr>
                <tr v-for="character,i in sessionCharacters">
                    <td>{{character.name}}</td>
                    <td><a href="#" onclick="return false;" @click="removeCharacter(i)">Remove</a></td>
                </tr>
            </table>
            <div class="response">
              <span class="info">{{ infoMessage }}</span>
              <span class="error">{{ errorMessage }}</span>
            </div>
            </div>

            <div class="chat-box">
              <div class="input" v-if="selectedType == 0 || selectedType == 2">
                <div class="speaker">
                  Speaker: <input v-model="speaker"/>
                </div>
                <textarea v-model="text"></textarea>
                <div class="send-button">
                  <button @click="send">Send</button>
                </div>
              </div>
              <textarea v-model="response" disabled></textarea>
              <div class="send-button" v-if="selectedType == 1  ">
                  <button @click="send">Start</button>
                </div>
            </div>
          </div>
          </div>
      </div>
    </div>
  </template>
  
  <script>
  import CharacterList from '../components/CharacterList'
  import api from '../services/api'
  import SocketioService from '../services/socketio.service.js';

  export default {
    name: 'Chat',
    components: {
      CharacterList
    },
    data() {
      return {
        page: 'chat',
        listKey: 0,
        selectedType: 0, 
        characters: null,
        sessionCharacters: [],
        speaker: "",
        text: "",
        response: "Response will appear here.",
        infoMessage: "",
        errorMessage: ""
      }
    },
    created() {
      SocketioService.setupSocketConnection();
      SocketioService.on('chat_response', (response) => {
        if(this.response == 'Awaiting response...') this.response = ''
        this.response += response
      })

      api().get('character').then((response) => {
        this.characters = response.data
        this.listKey++
      })
    },
    beforeUnmount() {
      SocketioService.disconnect();
    },
    watch: {
      selectedType: function(newValue, oldValue) {
        if(this.sessionCharacters.length == 0) {
          return
        }
        if(newValue == 0) {
          this.sessionCharacters = [this.sessionCharacters[0]]
        }
      }
    },
    methods: {
      addCharacter(character) {
        if(this.selectedType == 0 && this.sessionCharacters.length > 0) {
          return
        }
        
        if(!this.sessionCharacters.find(c => c.name == character.name))
          this.sessionCharacters.push(character)
      },
      removeCharacter(i) {
        this.sessionCharacters.splice(i, 1)
      },
      send() {
        let ids = this.sessionCharacters.map(c => c.id)
        if(this.selectedType == 0) {
          this.response = "Awaiting response..."
          api().post('chat', {type: this.selectedType, speaker: this.speaker, text: this.text, ids: ids}) 
            .then((response) => {
              if(response.status != 200) {
                this.response = "An error occured."
                return
              }

              this.response = response.data
            })
        } else if(this.selectedType == 1 && this.sessionCharacters.length < 2) {
          this.errorMessage ="When N2N is selected, at least two characters must be present in the list."
        } else if(this.selectedType == 1 && this.sessionCharacters.length >= 2) {
          this.response = "Awaiting response..."
          this.infoMessage = "First two characters in the list will be used to initiate conversation."
          this.errorMessage = ""
          SocketioService.send('chat', {type: this.selectedType, text: this.text, ids: ids})
        } else if(this.selectedType == 2) {
          this.response = "Awaiting response..."
          SocketioService.send('chat', {type: this.selectedType, speaker: this.speaker, text: this.text, ids: ids})
        }
      }
    }
  }
  </script>
  
  <style>
 #chat .chat-inner {
    display: flex;
  }

  .session {
    margin-left: 100px;
  }

  .session-type {
    margin-left: 20px;
  }

  .session .inner {
    display: flex
  }

  .router {
    text-align:left;
    margin: 0 20px 0 20px;
  }


  .session .session-list table{
    width: 300px;
  }

  .session .session-list table tr td, .character-list .list table tr th{
    border-style: ridge;
  }

  .session .chat-box {
    margin: 20px 0 0 200px;
  }

  .session .chat-box button {
    text-align: left;
  }
  
  .session .chat-box .input {
    padding: 0 0 20px 0;
  }

  .session .chat-box textarea {
    height: 200px;
    width: 500px;
  }

  .session .chat-box .speaker {
    text-align: left;
    padding-bottom: 5px;
  }

  .session .chat-box .send-button {
    text-align: left;
  }

  .response {
    padding-top: 5px;
    text-align: left;
  }

  .info, .error {
    position: absolute;
    max-width: 400px;
  }

  .error {
    color:brown
  }
  </style>
  