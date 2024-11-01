<template>
    <div id="alive">
        <div class="router">
            <router-link to="/">Home</router-link>
            <router-link to="/chat">Chat</router-link>
            <hr>
        </div>

        <div class="alive-inner">
            <CharacterList :characters="characters" :page="page" @add-character="addCharacter" :key="listKey"/>
            <div  class ="alive-characters">
                <table>
                    <tr>
                        <th>Name</th>
                        <th>Form ID</th>
                        <th> == </th>
                        <th> == </th>
                    </tr>
                    <tr v-for="character,i in aliveCharacters">
                        <td><a href="#" onclick="return false;" @click="showCharacter(character)">{{ character.name }}</a></td>
                        <td><input v-model="character.formId"/></td>
                        <td><a href="#" onclick="return false;" @click="saveCharacter(character)">Save</a></td>
                        <td><a href="#" onclick="return false;" @click="removeCharacter(i)">Remove</a></td>
                    </tr>
                </table>
            </div>
            <Character v-if="character" @character-saved="updateList" @play-sound="playSound" @character-view-update="updateCharacter" :character="character" :characters="characters" :voices="voices" :adding="adding" :key="characterKey"/>
        </div>
    </div>
  </template>
  
  <script>
  import CharacterList from '../components/CharacterList'
  import api from '../services/api'

  export default {
    name: 'Alive',
    components: {
      CharacterList
    },
    data() {
      return {
        page: 'alive',
        listKey: 0,
        characters: null,
        character: null,
        aliveCharacters: []
      }
    },
    created() {
        api().get('character').then((response) => {
        this.characters = response.data
        this.listKey++
      })

      api().get('character/alive').then((response) => {
        this.aliveCharacters = response.data
        this.listKey++
      })
    },
    watch: {
    },
    methods: {
      addCharacter(character) {
      if(!this.aliveCharacters.find(c => c.name == character.name))
          api().post('character/alive', character).then((response) => {
              this.aliveCharacters.push(character)
          })
      },
      showCharacter(character) {
        this.character = character
      },
      saveCharacter(character) {
        api().post('character', character).then((response) => {
          })
        api().post('character/alive', character).then((response) => {
          })
      },
      removeCharacter(i) {
        api().delete('character/alive/' + this.aliveCharacters[i].id).then((response) => {
            this.aliveCharacters.splice(i, 1)
        })
      }
    }
  }
  </script>
  
  <style>
 #alive .alive-inner {
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

  #alive .alive-inner a {
    color: #42b983;
  }

  #alive .alive-inner .alive-characters {
    margin-left: 100px;
  }

  #alive .alive-inner .alive-characters table{
    width: 300px;
  }

  #alive .alive-inner .alive-characters table tr td, .character-list .list table tr th{
    border-style: ridge;
  }


  .info, .error {
    position: absolute;
    max-width: 400px;
  }

  .error {
    color:brown
  }
  </style>
  