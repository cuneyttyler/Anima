export default class TextUtil {
    private static Split(text: String) : Array<String>{
        return text.replace(/([.?!])(\s)*(?=[A-Z])/g, "$1|")
          .split("|")
          .filter(sentence => !!sentence)
          .map(sentence => sentence.trim());
      }

    static SplitToSentences(text: string) : Array<String>{
        return this.Split(text)
    }

    Test() {}
}