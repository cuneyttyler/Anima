<template>
  <div id="app">
    <CharacterList :characters="characters" @show-character="showCharacter" @show-add-character="showAddCharacter" :key="listKey"/>
    <Character v-if="character" @character-saved="updateList" @play-sound="playSound" @character-view-update="characterKey++" :character="character" :characters="characters" :voices="voices" :adding="adding" :key="characterKey"/>
    <Voices v-if="character" @voice-selected="voiceSelected" @play-sound="playSound" :gender="character.gender" :voices="voices" :key="voicesKey"/>

  </div>
</template>

<script>
import CharacterList from './components/CharacterList'
import Character from './components/Character'
import Voices from './components/Voices'
import api from './services/api'

export default {
  name: 'App',
  components: {
    CharacterList,
    Character,
    Voices
  },
  data() {
    return {
      listKey: 0,
      characterKey: 0,
      voicesKey: 0,
      characters: [],
      character: null,
      voices: null,
      adding: false,
    }
  },
  created() {
    api().get('character')
      .then((response) => {
          this.characters = response.data
          this.listKey++
      })
  },
  watch: {
    'character.gender': function(newValue, oldValue) {
      if(newValue.toLowerCase() != 'male' && newValue.toLowerCase() != 'female')
        return
      api().get('voices/' + newValue.toLowerCase())
        .then((response) => {
          this.voices = response.data
        })
      this.voicesKey++
    }
  },
  methods: {
    showCharacter(character) {
      this.character = character

      if(!character.gender || (character.gender.toLowerCase() != 'male' && character.gender.toLowerCase() != 'female'))
        return;

      api().get('voices/' + character.gender.toLowerCase())
        .then((response) => {
          this.voices = response.data
        })
      this.adding = false
    },

    showAddCharacter() {
      this.character = {gender: 'FEMALE', mood: {}, personality: {}}

      api().get('voices/' + this.character.gender.toLowerCase())
        .then((response) => {
          this.voices = response.data
        })
      this.adding = true
    },

    voiceSelected(voice) {
      this.character.voice = voice
      this.characterKey++
    },

    playSound(gender, voice, pitch) {
      api().get('voice/' + gender + "/" + voice + "/" + pitch, {
          responseType: 'blob',
        })
      .then((response) => {
        const blob = new Blob([response.data], { type: response.headers['content-type'] });
        const blobUrl = URL.createObjectURL(blob);
        console.log(blobUrl)

        // Create an <audio> element and play the music
        const audio = new Audio(blobUrl);
        audio.play();
      })
    },

    updateList(character) {
      for(let i in this.characters) {
        if(this.characters[i].id == character.id) {
          this.characters[i] = character
          break
        }
      }
      this.gender = character.gender
    }
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
  padding: 0 0 50px 0;
  display: flex;
}
</style>
