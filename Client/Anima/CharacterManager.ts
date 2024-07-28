import path from "path";
import fs from 'fs';

const CHARACTERS_FILE_PATH = path.resolve("./World/SkyrimCharacters.json")
const CHARACTERS = JSON.parse(fs.readFileSync(CHARACTERS_FILE_PATH, 'utf-8'));
const ALIVE_CHARACTERS_FILE_PATH = path.resolve("./World/SkyrimAliveCharacters.json")
const ALIVE_CHARACTERS = JSON.parse(fs.readFileSync(ALIVE_CHARACTERS_FILE_PATH, 'utf-8'));

export default class CharacterManager {

    GetMoodText(character) {
        let text: string = ""
        if(character.mood.joy < -75) {
            text += "Utterly despondent, incapable of experiencing joy. Emotions are overwhelmingly negative and nothing seems to bring happiness."
        } else if(character.mood.joy > -75 && character.mood.joy < -50 ) {
            text += "Very low ability to experience joy, plagued by persistent negative thoughts. Rarely finds anything enjoyable."
        } else if(character.mood.joy > -50 && character.mood.joy < -25 ) {
            text += "Struggles to find joy in everyday situations. The tendency is to focus on the negative side of things."
        } else if(character.mood.joy > -25 && character.mood.joy < 0 ) {
            text += "Occasionally finds moments of joy but often overshadowed by other emotions. There's a slight inclination towards positivity."
        } else if(character.mood.joy > 0 && character.mood.joy < 25 ) {
            text += "Neutral position on joy. Capable of experiencing it but not consistently. There's a balanced approach to happiness."
        } else if(character.mood.joy > 25 && character.mood.joy < 50 ) {
            text += "Regularly finds joy in life and maintains a positive outlook. Small things tend to bring happiness."
        } else if(character.mood.joy > 50 && character.mood.joy < 75 ) {
            text += "Experiences joy frequently. Life is seen through an optimistic lens, and there's a strong tendency to focus on the positive aspects."
        } else if(character.mood.joy > 75) {
            text += "Almost always in a state of joy, with a very positive perspective on life. Happiness is a dominant and consistent feeling."
        } else if(character.mood.joy == 100) {
            text += "Constantly overwhelmed by joy, exuding positivity in every aspect of life. Joy defines their entire existence."
        }

        if(character.mood.fear < -75) {
            text += "Fearful and anxious to the point of paralyzing their ability to act. The world seems overwhelmingly threatening."
        } else if(character.mood.fear > -75 && character.mood.fear < -50 ) {
            text += "Deeply anxious, finding it very difficult to stay positive in the face of fears. Frequent panic and distress."
        } else if(character.mood.fear > -50 && character.mood.fear < -25 ) {
            text += "Experiences moderate fear that sometimes overshadows their positive outlook. Fear can occasionally dampen their positivity."
        } else if(character.mood.fear > -25 && character.mood.fear < 0 ) {
            text += "Fear is present but managed. There are moments of positivity despite underlying anxiety."
        } else if(character.mood.fear > 0 && character.mood.fear < 25 ) {
            text += "Balanced state where fear and positivity coexist. Capable of staying positive even when fearful situations arise."
        } else if(character.mood.fear > 25 && character.mood.fear < 50 ) {
            text += "Fear is present but does not significantly impact overall positivity. Manages to stay positive despite occasional anxiety."
        } else if(character.mood.fear > 50 && character.mood.fear < 75 ) {
            text += "Fear is under control and rarely affects their positivity. Able to stay optimistic even in fear-inducing situations."
        } else if(character.mood.fear > 75) {
            text += "Fear is mostly managed, and positivity shines through. They handle fear with resilience and a hopeful attitude."
        } else if(character.mood.fear == 100) {
            text += "Overcomes fear with ease, consistently maintaining a positive outlook. Fear is seen as a challenge to be met with optimism."
        }

        if(character.mood.trust < -75) {
            text += "Completely distrustful, seeing the world as a place full of deceit. Positive feelings are almost nonexistent."
        } else if(character.mood.trust > -75 && character.mood.trust < -50 ) {
            text += "Struggles with trust, leading to a very cautious and skeptical view of others. Positive trust is rare."
        } else if(character.mood.trust > -50 && character.mood.trust < -25 ) {
            text += "Has a moderate level of distrust that affects their ability to trust positively. Often questions intentions."
        } else if(character.mood.trust > -25 && character.mood.trust < 0 ) {
            text += "Trust is limited but present. There's some positivity in their trust, though caution still prevails."
        } else if(character.mood.trust > 0 && character.mood.trust < 25 ) {
            text += "Neutral stance on trust. Capable of trusting others but does so with a balanced approach."
        } else if(character.mood.trust > 25 && character.mood.trust < 50 ) {
            text += "Generally trusting with a positive outlook on others. Manages to see the good in people despite occasional doubts."
        } else if(character.mood.trust > 50 && character.mood.trust < 75 ) {
            text += "Trusts others easily and maintains a positive view of their intentions. Trust is a strong component of their personality."
        } else if(character.mood.trust > 75) {
            text += "Highly trusting and positive about the reliability of others. Trust is a key element of their optimistic nature."
        } else if(character.mood.trust == 100) {
            text += "Completely trusting and positive, seeing the best in everyone and believing in the goodness of people wholeheartedly."
        }

        if(character.mood.surprise < -75) {
            text += "Completely resistant to surprise, unable to find any positive aspect in unexpected events. Highly predictable and unresponsive to novelty."
        } else if(character.mood.surprise > -75 && character.mood.surprise < -50 ) {
            text += "Generally unsettled by surprises, leading to a very cautious and negative reaction. Rarely finds positivity in the unexpected."
        } else if(character.mood.surprise > -50 && character.mood.surprise < -25 ) {
            text += "Experiences discomfort with surprises, though there is an occasional glimpse of positivity. Overall reaction is mostly negative."
        } else if(character.mood.surprise > -25 && character.mood.surprise < 0 ) {
            text += "Surprised sometimes, but often reacts with apprehension. There’s a slight positive aspect, though caution prevails."
        } else if(character.mood.surprise > 0 && character.mood.surprise < 25 ) {
            text += "Neutral reaction to surprises. Capable of seeing the positive side but does not have a strong emotional response."
        } else if(character.mood.surprise > 25 && character.mood.surprise < 50 ) {
            text += "Enjoys surprises with a generally positive attitude. Finds joy and excitement in the unexpected occurrences."
        } else if(character.mood.surprise > 50 && character.mood.surprise < 75 ) {
            text += "Frequently delighted by surprises, seeing them as opportunities for positivity and excitement. Responds with enthusiasm."
        } else if(character.mood.surprise > 75) {
            text += "Almost always excited by surprises, perceiving them as highly positive and enjoyable. Thrives on novelty and unexpected events."
        } else if(character.mood.surprise == 100) {
            text += "Overwhelmed with joy by surprises, finding them exhilarating and purely positive. Surprises are a major source of happiness."
        }

        return text
    }

    GetPersonalityText(character) {
        let text = ""

        if(character.personality.positive < -75) {
            text += "Deeply negative outlook, seeing almost nothing as good. Constantly focuses on what’s wrong and finds little to appreciate or enjoy."
        } else if(character.personality.positive > -75 && character.personality.positive < -50 ) {
            text += "Predominantly negative with rare glimpses of positivity. Mostly sees the downside in situations and struggles to find good aspects."
        } else if(character.personality.positive > -50 && character.personality.positive < -25 ) {
            text += "Generally inclined towards negativity but occasionally recognizes positive elements. The outlook is more often pessimistic."
        } else if(character.personality.positive > -25 && character.personality.positive < 0 ) {
            text += "Slightly positive but frequently overshadowed by negativity. Finds occasional moments of joy but is generally cautious and skeptical."
        } else if(character.personality.positive > 0 && character.personality.positive < 25 ) {
            text += "Neutral stance on positivity. Able to recognize both positive and negative aspects in situations with a balanced perspective."
        } else if(character.personality.positive > 25 && character.personality.positive < 50 ) {
            text += "Regularly sees the positive side of things. Tends to focus on what’s good and maintains a generally optimistic attitude."
        } else if(character.personality.positive > 50 && character.personality.positive < 75 ) {
            text += "Strongly positive, with a tendency to view most situations optimistically. Finds joy and good in most aspects of life."
        } else if(character.personality.positive > 75) {
            text += "Highly positive, with a pervasive optimism that influences their overall view of life. Frequently finds reasons to be happy and hopeful."
        } else if(character.personality.positive == 100) {
            text += "Completely positive and upbeat, with an unwaveringly optimistic view of the world. Joy and positivity define their entire approach to life."
        }

        if(character.personality.peaceful < -75) {
            text += "Deeply disturbed, experiencing extreme levels of stress and unrest. Peace is entirely absent, replaced by constant anxiety and agitation."
        } else if(character.personality.peaceful > -75 && character.personality.peaceful < -50 ) {
            text += "Very low sense of peace, frequently overwhelmed by stress and conflict. Rarely finds calmness and serenity."
        } else if(character.personality.peaceful > -50 && character.personality.peaceful < -25 ) {
            text += "Generally uneasy, with occasional moments of peace overshadowed by ongoing tension. Peace is intermittent and not a dominant trait."
        } else if(character.personality.peaceful > -25 && character.personality.peaceful < 0 ) {
            text += "Often finds peace but it is frequently disrupted by stress. Experiences moments of calmness but remains prone to agitation."
        } else if(character.personality.peaceful > 0 && character.personality.peaceful < 25 ) {
            text += "Balanced state with occasional peace. Capable of experiencing calmness, but also experiences stress and tension."
        } else if(character.personality.peaceful > 25 && character.personality.peaceful < 50 ) {
            text += "Regularly finds peace and maintains a sense of calm. Life is generally tranquil, though occasional stressors are present."
        } else if(character.personality.peaceful > 50 && character.personality.peaceful < 75 ) {
            text += "Frequently peaceful, with a strong sense of calmness. Stress is managed well, and tranquility is a significant aspect of their experience."
        } else if(character.personality.peaceful > 75) {
            text += "Almost always peaceful, with a consistently calm demeanor. Experiences minimal stress and maintains a serene outlook."
        } else if(character.personality.peaceful == 100) {
            text += "Completely at peace, with a profound sense of calmness that defines their life. Stress and agitation are virtually non-existent."
        }

        if(character.personality.open < -75) {
            text += "Extremely closed-off and rigid, with a strong aversion to new experiences or ideas. Resists change and is highly skeptical of anything unfamiliar."
        } else if(character.personality.open > -75 && character.personality.open < -50 ) {
            text += "Very closed-minded, hesitant to embrace new experiences or perspectives. Maintains a cautious and traditional stance."
        } else if(character.personality.open > -50 && character.personality.open < -25 ) {
            text += "Generally reserved about new experiences, though occasionally open to new ideas. Prefers familiar routines and is cautious about change."
        } else if(character.personality.open > -25 && character.personality.open < 0 ) {
            text += "Slightly open to new experiences, but often prefers the comfort of the known. Willing to explore but with some reluctance."
        } else if(character.personality.open > 0 && character.personality.open < 25 ) {
            text += "Neutral position on openness. Capable of embracing new ideas and experiences but maintains a balanced approach to change."
        } else if(character.personality.open > 25 && character.personality.open < 50 ) {
            text += "Regularly open to new experiences and ideas. Enjoys exploring new possibilities and is generally receptive to change."
        } else if(character.personality.open > 50 && character.personality.open < 75 ) {
            text += "Strongly open-minded, frequently seeking out new experiences and ideas. Embraces change with enthusiasm and curiosity."
        } else if(character.personality.open > 75) {
            text += "Highly open to new experiences and ideas, with a proactive approach to exploring and adapting. Constantly seeks novelty and variety."
        } else if(character.personality.open == 100) {
            text += "Completely open, with an expansive and adventurous approach to life. Thrives on new experiences and ideas, always eager for exploration and growth."
        }

        if(character.personality.extravert < -75) {
            text += "Extremely introverted, avoiding social interactions and preferring solitude. Shuns external engagement and finds little pleasure in social activities."
        } else if(character.personality.extravert > -75 && character.personality.extravert < -50 ) {
            text += "Very introverted, with a strong preference for being alone and minimal interest in socializing. Finds external interactions taxing."
        } else if(character.personality.extravert > -50 && character.personality.extravert < -25 ) {
            text += "Generally reserved and prefers solitude over socializing. Engages in social activities infrequently and with reluctance."
        } else if(character.personality.extravert > -25 && character.personality.extravert < 0 ) {
            text += "Somewhat introverted, with occasional social interactions but a preference for alone time. Engages in social activities selectively."
        } else if(character.personality.extravert > 0 && character.personality.extravert < 25 ) {
            text += "Balanced between introversion and extraversion. Capable of enjoying social activities and solitary time equally."
        } else if(character.personality.extravert > 25 && character.personality.extravert < 50 ) {
            text += "Regularly enjoys social interactions and is comfortable in social settings. Prefers engaging with others but still values alone time."
        } else if(character.personality.extravert > 50 && character.personality.extravert < 75 ) {
            text += "Strongly extraverted, thriving on social interactions and finding energy in being around others. Enjoys frequent social activities."
        } else if(character.personality.extravert > 75) {
            text += "Highly extraverted, with a constant need for social engagement and external stimulation. Social activities are a major source of joy and energy."
        } else if(character.personality.extravert == 100) {
            text += "Completely extraverted, deriving immense pleasure from constant social interaction and external stimulation. Thrives in vibrant, active environments."
        }

        return text
    }

    GetUserProfile(profile) {
        if(!fs.existsSync(path.resolve("./Profiles/" + profile + "/profile.txt")))
            return null
        return fs.readFileSync(path.resolve("./Profiles/" + profile + "/profile.txt"), 'utf-8');
    }

    GetCharacterList() {
        return CHARACTERS
    }

    GetAliveCharacterList() {
        return ALIVE_CHARACTERS
    }

    GetCharacter(name) {
        let character = null;
        for(let i in CHARACTERS) {
            if(name.toLowerCase().replaceAll(" ", "_") == CHARACTERS[i].id.toLowerCase().replaceAll(" ", "_")) {
                character = CHARACTERS[i];
                break
            }
        }
        return character;
    }

    SaveCharacter(character) {
        let found = false
        for(let i in CHARACTERS) {
            if(CHARACTERS[i].id == character.id) {
                found = true
                CHARACTERS[i] = character
                break
            }
        }
        if(!found) {
            CHARACTERS.push(character)
        }

        fs.writeFileSync(CHARACTERS_FILE_PATH, JSON.stringify(CHARACTERS), 'utf8')
    }

    SaveAliveCharacter(character) {
        let found = false
        for(let i in ALIVE_CHARACTERS) {
            if(ALIVE_CHARACTERS[i].id == character.id) {
                found = true
                ALIVE_CHARACTERS[i] = character
                break
            }
        }
        if(!found) {
            ALIVE_CHARACTERS.push(character)
        }

        fs.writeFileSync(ALIVE_CHARACTERS_FILE_PATH, JSON.stringify(ALIVE_CHARACTERS), 'utf8')
    }

    DeleteCharacter(id) {
        let index = -1
        for(let i in CHARACTERS) {
            if(CHARACTERS[i].id == id) {
                index = parseInt(i)
                break
            }
        }

        if(index == -1) {
            return
        }

        CHARACTERS.splice(index, 1)
        fs.writeFileSync(CHARACTERS_FILE_PATH, JSON.stringify(CHARACTERS), 'utf8')
    }

    DeleteAliveCharacter(id) {
        let index = -1
        for(let i in ALIVE_CHARACTERS) {
            if(ALIVE_CHARACTERS[i].id == id) {
                index = parseInt(i)
                break
            }
        }

        if(index == -1) {
            return
        }

        ALIVE_CHARACTERS.splice(index, 1)
        fs.writeFileSync(ALIVE_CHARACTERS_FILE_PATH, JSON.stringify(ALIVE_CHARACTERS), 'utf8')
    }

    
}
