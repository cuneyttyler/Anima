;BEGIN FRAGMENT CODE - Do not edit anything between this and the end comment
;NEXT FRAGMENT INDEX 3
Scriptname PF__06005911 Extends Package Hidden

;BEGIN FRAGMENT Fragment_0
Function Fragment_0(Actor akActor)
;BEGIN CODE
AnimaCollegeLectures.SetStage(50)
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_2
Function Fragment_2(Actor akActor)
;BEGIN CODE
Debug.Trace("Anima: Lecture Change")
AnimaCollegeLectureEnding.SetValueInt(1)
ActorUtil.AddPackageOverride(Colette.GetActorRef(), AnimaColetteEndLecturePackage_2, 1)
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_1
Function Fragment_1(Actor akActor)
;BEGIN CODE
Debug.Trace("Anima: Lecture End")
AnimaCollegeLectureEnding.SetValueInt(1)
ActorUtil.AddPackageOverride(Colette.GetActorRef(), AnimaColetteEndLecturePackage_2, 1)
;END CODE
EndFunction
;END FRAGMENT

;END FRAGMENT CODE - Do not edit anything between this and the begin comment

Quest Property AnimaCollegeLectures  Auto  

GlobalVariable Property AnimaCollegeLectureEnding  Auto  

Package Property AnimaColetteEndLecturePackage_2  Auto  

ReferenceAlias Property Colette  Auto  
