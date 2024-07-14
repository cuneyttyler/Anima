<template>
    <div id="chat">
      <CharacterList :characters="characters" :page="page" @add-character="addCharacter" :key="listKey"/>
      
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
          </div>

          <div class="chat-box">
            <div class="input">
              <div class="speaker">
                Speaker: <input v-model="speaker"/>
              </div>
              <textarea v-model="text"></textarea>
              <div class="send-button">
                <button @click="send">Send</button>
              </div>
            </div>
            <textarea v-model="response" disabled></textarea>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import CharacterList from '../components/CharacterList'
  import api from '../services/api'
  
  export default {
    name: 'Chat',
    components: {
      CharacterList
    },
    data() {
      return {
        page: 'chat',
        listKey: 0,
        characters: null,
        sessionCharacters: [],
        speaker: "",
        text: "",
        response: "Response will appear here."
      }
    },
    created() {
      api().get('character').then((response) => {
        this.characters = response.data
        this.listKey++
      })
    },
    watch: {
    },
    methods: {
      addCharacter(character) {
        this.sessionCharacters.push(character)
      },
      removeCharacter(i) {
        this.sessionCharacters.splice(i, 1)
      },
      send() {
        this.response = "Awaiting response..."
        let ids = this.sessionCharacters.map(c => c.id)
        api().post('chat', {speaker: this.speaker, text: this.text, ids: ids})
          .then((response) => {
            if(response.status != 200) {
              this.response = "An error occured."
              return
            }

            this.response = response.data
          })
      }
    }
  }
  </script>
  
  <style>
  #chat {
    font-family: 'Avenir', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    margin-top: 60px;
    padding: 0 0 50px 0;
    display: flex;
  }

  .session {
    margin-left: 100px;
  }

  .session .inner {
    display: flex
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
  </style>
  