;BEGIN FRAGMENT CODE - Do not edit anything between this and the end comment
;NEXT FRAGMENT INDEX 5
Scriptname PF_AnimaDrevisLecturePackage_06005902 Extends Package Hidden

;BEGIN FRAGMENT Fragment_3
Function Fragment_3(Actor akActor)
;BEGIN CODE
Debug.Trace("Anima: Lecture End")
AnimaCollegeLectureEnding.SetValueInt(1)
ActorUtil.AddPackageOverride(Drevis.GetActorRef(), AnimaDrevisEndLecturePackage, 1)
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_2
Function Fragment_2(Actor akActor)
;BEGIN CODE
AnimaCollegeLectures.SetStage(20)
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_4
Function Fragment_4(Actor akActor)
;BEGIN CODE
Debug.Trace("Anima: Lecture Change")
AnimaCollegeLectureEnding.SetValueInt(1)
ActorUtil.AddPackageOverride(Drevis.GetActorRef(), AnimaDrevisEndLecturePackage, 1)
;END CODE
EndFunction
;END FRAGMENT

;END FRAGMENT CODE - Do not edit anything between this and the begin comment

Quest Property AnimaCollegeLectures  Auto  

GlobalVariable Property AnimaCollegeLectureEnding  Auto  

Package Property AnimaDrevisEndLecturePackage  Auto  

ReferenceAlias Property Drevis  Auto  
