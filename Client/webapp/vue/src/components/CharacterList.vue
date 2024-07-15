<template>
    <div class="character-list">
      <div class="filter">
          Filter: <input v-model="filterText"/>
      </div>
      <div class="list">
          <table>
              <tr>
                  <th>Name</th>
                  <th>Voice</th>
              </tr>
              <tr v-for="character,i in filteredCharacters">
                  <td><a href="#" onclick="return false;" @click="openCharacter(character)">{{ character.name }}</a></td>
                  <td>{{ character.voice }}</td>
              </tr>
          </table>
      </div>
      <div class="button">
        <button v-if="page == 'home'" @click="showAddCharacter()">Add Character</button>
        <button v-if="page == 'chat'" @click="addCharacter()">Add Character</button>
      </div>
    </div>
  </template>
  
  <script>
  import api from '../services/api'

  export default {
    name: 'CharacterList',
    props: ['page', 'characters'],
    data () {
      return {
        filterText: "",
        characters: [],
        filteredCharacters: []
      }
    }, 
    created() {
        this.filteredCharacters = this.characters
    },
    updated() {
    },
    watch: {
        filterText: function(newFilter, oldFilter) {
            if(newFilter == "") {
                this.filteredCharacters = this.characters
                return
            }
            // || (this.characters[i].voice && this.characters[i].voice.includes(newFilter))
            
            let filteredCharacters = []
            for(let i in this.characters) {
                if(this.characters[i].name.toLowerCase().includes(newFilter.toLowerCase())) {
                    filteredCharacters.push(this.characters[i])
                }
            }
            this.filteredCharacters = filteredCharacters
        }
    },
    methods: {
        openCharacter(character){
          if(this.page == 'home')
            this.$emit('show-character', character)
          else if(this.page == 'chat')
            this.$emit('add-character', character)
        },
        showAddCharacter() {
          this.$emit('show-add-character')
        }
    }
  }
  </script>
  
  <!-- Add "scoped" attribute to limit CSS to this component only -->
  <style scoped>
  h1, h2 {
    font-weight: normal;
  }
  ul {
    list-style-type: none;
    padding: 0;
  }
  li {
    display: inline-block;
    margin: 0 10px;
  }
  a {
    color: #42b983;
  }
  .character-list {
    margin-left: 60px;
  }
  .character-list .list {
    height: 750px;
    overflow: scroll;
    overflow-x: hidden;
  }
  .character-list .list table{
    width: 300px;
  }
  .character-list .list table tr td, .character-list .list table tr th{
    border-style: ridge;
  }
  .character-list .filter {
    padding: 5px;   
    text-align: left;
  }
  .character-list .button {
    text-align: left
  }
  </style>
  