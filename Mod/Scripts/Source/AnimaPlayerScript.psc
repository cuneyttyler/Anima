Scriptname AnimaPlayerScript extends ReferenceAlias  

quest property AnimaDialogueQuest auto
quest property AnimaCollegeLectures auto
GlobalVariable property AnimaCollegeLectureStarted auto

Event OnPlayerLoadGame()
	(AnimaDialogueQuest as AnimaDialogueQuestScript).Reset()
	AnimaCollegeLectures.SetStage(5)
	If AnimaCollegeLectureStarted.GetValueInt() == 1
		(AnimaCollegeLectures as AnimaCollegeLecturesQuestScript).Stop()
	EndIf
EndEvent

Event OnLocationChange(Location oldLocation, Location newLocation)
	(AnimaDialogueQuest as AnimaDialogueQuestScript).Reset()
EndEvent