Scriptname AnimaPlayerScript extends ReferenceAlias  

quest property AnimaDialogueQuest auto

Event OnPlayerLoadGame()
	Debug.Trace("Anima: Game Loaded")
	(AnimaDialogueQuest as AnimaDialogueQuestScript).Reset()
EndEvent

Event OnLocationChange(Location oldLocation, Location newLocation)
	Debug.Trace("Anima: Location Changed.")
	(AnimaDialogueQuest as AnimaDialogueQuestScript).Reset()
EndEvent