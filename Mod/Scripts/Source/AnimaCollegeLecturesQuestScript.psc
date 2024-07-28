scriptname AnimaCollegeLecturesQuestScript extends Quest

Event OnInit()
    self.RegisterForModEvent("BLC_EndLecture", "EndLecture")
EndEvent

Function EndLecture(String eventName, String strArg, Float numArg, Form sender)
    SetVars()
    self.SetStage(100)
EndFunction

Function SetVars()
   (AnimaCollegeLectureStartTrigger  as AnimaCollegeLecturesTriggerScript).isJzargo = false
   (AnimaCollegeLectureStartTrigger  as AnimaCollegeLecturesTriggerScript).isOnmund = false
   (AnimaCollegeLectureStartTrigger  as AnimaCollegeLecturesTriggerScript).isBrelyna = false
   (AnimaCollegeLectureStartTrigger  as AnimaCollegeLecturesTriggerScript).isTeacher = false
EndFunction

Function Stop()
    AnimaSKSE.EndLecture()
EndFunction

ObjectReference Property AnimaCollegeLectureStartTrigger  Auto  