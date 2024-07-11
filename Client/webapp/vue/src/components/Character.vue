<template>
    <div class="character">
        <table>
             <tr>
                <td class="first">Id: </td>
                <td><input v-model="character.id"/></td>
            </tr>
            <tr>
                <td class="first">Name: </td>
                <td><input v-model="character.name"/></td>
            </tr>
            <tr>
                <td class="first">Gender: </td>
                <td><input v-model="character.gender"/></td>
            </tr>
            <tr>
                <td class="first">Pronoun: </td>
                <td><input v-model="character.pronoun"/></td>
            </tr>
            <tr>
                <td class="first">Life Stage: </td>
                <td><input v-model="character.lifeStage"/></td>
            </tr>
            <tr>
                <td class="first">Role: </td>
                <td><input v-model="character.characterRole"/></td>
            </tr>
            <tr>
                <td class="first">Description: </td>
                <td><textarea class="big" v-model="character.description"></textarea></td>
            </tr>
            <tr>
                <td class="first">Personality Description: </td>
                <td><textarea class="small" v-model="character.personalityDescription"></textarea></td>
            </tr>
            <tr>
                <td class="first">Motivation: </td>
                <td><textarea class="big" v-model="character.motivation"></textarea></td>
            </tr>
            <tr>
                <td class="first">Interests: </td>
                <td><textarea class="small" v-model="character.hobbyOrInterests"></textarea></td>
            </tr>
            <tr>
              <td class="first">Flaws: </td>
              <td><textarea class="big" v-model="character.flaws"></textarea></td>
            </tr>
            <tr>
                <td class="first">Example Dialogue: </td>
                <td><textarea class="small" v-model="character.exampleDialogue"></textarea></td>
            </tr>
            <tr>
              <td class="first">Facts: </td>
              <td><textarea class="big" v-model="character.facts"></textarea></td>
            </tr>
            <tr>
              <td class="first">Voice: </td>
              <td><input v-model="character.voice"/> <a href="#" onclick="return false;" @click="playSound(character.gender, character.voice, character.voicePitch)"><img class="play-button" src="@/assets/play_button.png"></a></td>
            </tr>
            <tr>
              <td class="first">Voice Pitch: </td>
              <td><input v-model="character.voicePitch"/></td>
            </tr>
            <tr>
                <td class="first">Mood::Joy: </td>
                <td><input v-model="character.mood.joy"/></td>
            </tr>
            <tr>
                <td class="first">Mood::Fear: </td>
                <td><input v-model="character.mood.fear"/></td>
            </tr>
            <tr>
                <td class="first">Mood::Trust: </td>
                <td><input v-model="character.mood.trust"/></td>
            </tr>
            <tr>
                <td class="first">Mood::Surprise: </td>
                <td><input v-model="character.mood.surprise"/></td>
            </tr>
            <tr>
                <td class="first">Personality::Positive: </td>
                <td><input v-model="character.personality.positive"/></td>
            </tr>
            <tr>
                <td class="first">Personality::Peaceful: </td>
                <td><input v-model="character.personality.peaceful"/></td>
            </tr>
            <tr>
                <td class="first">Personality::Open: </td>
                <td><input v-model="character.personality.open"/></td>
            </tr>
            <tr>
                <td class="first">Personality::Extravert: </td>
                <td><input v-model="character.personality.extravert"/></td>
            </tr>
        </table>
        <div class="update">
          <button @click="save()">Save</button>
          <button @click="remove()">Delete</button>
          <span class="response">{{ responseMessage }}</span>
          <span class="error-response">{{ errorMessage }}</span>
        </div>
    </div>
  </template>
  
  <script>
  import api from '../services/api'

  export default {
    name: 'Character',
    props: ['character'],
    data () {
      return {
        responseMessage: "",
        errorMessage: ""
      }
    }, 
    created() {
      if(!this.character.voicePitch) {
        this.character.voicePitch = 0
      }
    },
    updated() {
      this.character.voicePitch = 0
    },
    methods: {
        playSound(gender, voice, pitch) {
          this.$emit("play-sound", gender, voice, pitch)
        },
        isBetween(num, min, max) {
          if(num == null || (num != 0 && num == "")) // check if null
            throw Error()
          parseInt(num) // check if number
          return num <= max && num >= min
        },
        validateNumberFields() {
          try {
            if(this.character.voicePitch)
              parseFloat(this.character.voicePitch)

            if(!this.isBetween(this.character.mood.joy, -100, 100) || !this.isBetween(this.character.mood.fear, -100, 100) 
              || !this.isBetween(this.character.mood.trust, -100, 100) || !this.isBetween(this.character.mood.surprise, -100, 100) 
              || !this.isBetween(this.character.personality.positive, -100, 100) || !this.isBetween(this.character.personality.peaceful, -100, 100)
              || !this.isBetween(this.character.personality.open, -100, 100) || !this.isBetween(this.character.personality.extravert, -100, 100))
                throw Error()

            return true
          } catch (err) {
            return false
          }
        },
        save() {
          this.errorMessage = ""
          if(this.character.gender != "MALE" && this.character.gender != "FEMALE") {
            this.errorMessage = "Gender can be 'MALE' or 'FEMALE'"
            return
          }

          if(this.character.lifeStage != 'CHILDHOOD' && this.character.lifeStage != 'YOUNG_ADULTHOOD'
            && this.character.lifeStage != 'MIDDLE_ADULTHOOD' && this.character.lifeStage != 'LATE_ADULTHOOD') {
              this.errorMessage = "Life stage can be [CHILDHOOD, YOUNG_ADULTHOOD, MIDDLE_ADULTHOOD, LATE_ADULTHOOD]"
              return
            }

          if(!this.validateNumberFields()) {
            this.errorMessage =  "Voice Pitch needs to be a float. Mood::Joy, Mood::Fear, Mood::Trust, Mood::Surprise, Personality::Positive, Personality::Peaceful, " +
            "Personality::Open, Personality::Extravert needs to be a number between -100 and 100."
            return
          }

          api().post('character', this.character)
            .then((response) => {
              this.responseMessage = "Save Successful."
              this.$emit('character-saved', this.character)
              setTimeout(() => {
                this.responseMessage = ""
              }, 2000)
            })
        },
        remove() {
          api().delete('character/' + this.character.id)
            .then((response) => {
              window.location.href = ""
            })
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
  .character {
    margin-left: 100px;
  }
  .character table {
    width: 600px;
    border-style:ridge;
  }
  .character table tr td {
    text-align: left;
    border-style: ridge;
  }
  .character table tr td.first {
      width: 100px;
  }
  .character table textarea.small{
    width: 400px;
    height: 50px; 
  }
  .character table textarea.big{
    width: 400px;
    height: 100px; 
  }

  .character table .play-button{
    vertical-align: middle;
    margin-left: 23%;
    width: 20px;
    height: 20px; 
  }
  .character .update {
    text-align: left;
    margin-top: 20px;
  }
  .character .update .response {
  }
  .character .update .error-response {
    max-width: 500px;
    position: absolute;
    margin-left: 10px;
    color:#f71616
  }
  </style>
  