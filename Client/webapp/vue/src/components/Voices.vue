<template>
    <div class="voices">
        <table v-if="gender">
             <tr v-for="voice in voices">
                <td class="">{{ voice }}</td>
                <td><a href="#" onclick="return false;" @click="selectVoice(voice)">Select</a></td>
                <td><a href="#" onclick="return false;" @click="playSound(voice)"><img class="play-button" src="@/assets/play_button.png"></a></td>
            </tr>
        </table>
        <span v-if="!gender">
          GENDER is not present.
        </span>
    </div>
  </template>
  
  <script>
  export default {
    name: 'Voices',
    props: ['gender', 'voices'],
    data () {
      return {
      }
    }, 
    created() {
        
    },
    updated() {
    },
    methods: {
        selectVoice(voice) {
          this.$emit("voice-selected", voice)
        },
        playSound(voice) {
          this.$emit('play-sound', this.gender, voice, 0.0)
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
 
  .voices {
    margin-left: 100px;
  }
  .voices span {
    color:#f71616
  }
  .voices table {
    width: 300px;
    border-style:ridge;
  }
  .voices table tr td {
    text-align: left;
    border-style: ridge;
  }
  .voices table .play-button{
    vertical-align: middle;
    margin-left: 23%;
    width: 20px;
    height: 20px; 
  }
  </style>
  