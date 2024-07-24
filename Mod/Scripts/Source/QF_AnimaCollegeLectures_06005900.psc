;BEGIN FRAGMENT CODE - Do not edit anything between this and the end comment
;NEXT FRAGMENT INDEX 21
Scriptname QF_AnimaCollegeLectures_06005900 Extends Quest Hidden

;BEGIN ALIAS PROPERTY Colette
;ALIAS PROPERTY TYPE ReferenceAlias
ReferenceAlias Property Alias_Colette Auto
;END ALIAS PROPERTY

;BEGIN ALIAS PROPERTY Arniel
;ALIAS PROPERTY TYPE ReferenceAlias
ReferenceAlias Property Alias_Arniel Auto
;END ALIAS PROPERTY

;BEGIN ALIAS PROPERTY Faralda
;ALIAS PROPERTY TYPE ReferenceAlias
ReferenceAlias Property Alias_Faralda Auto
;END ALIAS PROPERTY

;BEGIN ALIAS PROPERTY CurrentTeacher
;ALIAS PROPERTY TYPE ReferenceAlias
ReferenceAlias Property Alias_CurrentTeacher Auto
;END ALIAS PROPERTY

;BEGIN ALIAS PROPERTY TeacherMarker
;ALIAS PROPERTY TYPE ReferenceAlias
ReferenceAlias Property Alias_TeacherMarker Auto
;END ALIAS PROPERTY

;BEGIN ALIAS PROPERTY Tolfdir
;ALIAS PROPERTY TYPE ReferenceAlias
ReferenceAlias Property Alias_Tolfdir Auto
;END ALIAS PROPERTY

;BEGIN ALIAS PROPERTY Sergius
;ALIAS PROPERTY TYPE ReferenceAlias
ReferenceAlias Property Alias_Sergius Auto
;END ALIAS PROPERTY

;BEGIN ALIAS PROPERTY BrelynaMarker
;ALIAS PROPERTY TYPE ReferenceAlias
ReferenceAlias Property Alias_BrelynaMarker Auto
;END ALIAS PROPERTY

;BEGIN ALIAS PROPERTY Drevis
;ALIAS PROPERTY TYPE ReferenceAlias
ReferenceAlias Property Alias_Drevis Auto
;END ALIAS PROPERTY

;BEGIN ALIAS PROPERTY JzargoMarker
;ALIAS PROPERTY TYPE ReferenceAlias
ReferenceAlias Property Alias_JzargoMarker Auto
;END ALIAS PROPERTY

;BEGIN ALIAS PROPERTY Phinis
;ALIAS PROPERTY TYPE ReferenceAlias
ReferenceAlias Property Alias_Phinis Auto
;END ALIAS PROPERTY

;BEGIN ALIAS PROPERTY Brelyna
;ALIAS PROPERTY TYPE ReferenceAlias
ReferenceAlias Property Alias_Brelyna Auto
;END ALIAS PROPERTY

;BEGIN ALIAS PROPERTY OnmundMarker
;ALIAS PROPERTY TYPE ReferenceAlias
ReferenceAlias Property Alias_OnmundMarker Auto
;END ALIAS PROPERTY

;BEGIN FRAGMENT Fragment_15
Function Fragment_15()
;BEGIN CODE
Debug.Trace("Anima: CollegeLectures Stage 60")
Alias_CurrentTeacher.ForceRefTo(Alias_Tolfdir.GetActorRef())
AnimaCollegeLectureOngoing_2.SetValueInt(1)
AnimaCurrentLecture.SetValueInt(5)
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_6
Function Fragment_6()
;BEGIN CODE
Debug.Trace("Anima: CollegeLecturesQuest Init")
SetObjectiveDisplayed(0)
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_0
Function Fragment_0()
;BEGIN CODE
Debug.Trace("Anima: CollegeLectures Stage 10")
Alias_CurrentTeacher.ForceRefTo(Alias_Colette.GetActorRef())
AnimaCollegeLectureOngoing.SetValueInt(1)
AnimaCurrentLecture.SetValueInt(0)
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_9
Function Fragment_9()
;BEGIN CODE
Debug.Trace("Anima: CollegeLectures Stage 30")
Alias_CurrentTeacher.ForceRefTo(Alias_Arniel.GetActorRef())
AnimaCollegeLectureOngoing.SetValueInt(1)
AnimaCurrentLecture.SetValueInt(2)
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_17
Function Fragment_17()
;BEGIN CODE
Debug.Trace("Anima: CollegeLectures Stage 70")
Alias_CurrentTeacher.ForceRefTo(Alias_Sergius.GetActorRef())
AnimaCollegeLectureOngoing.SetValueInt(1)
AnimaCurrentLecture.SetValueInt(6)
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_7
Function Fragment_7()
;BEGIN CODE
Debug.Trace("Anima: CollegeLectures Stage 20")
Alias_CurrentTeacher.ForceRefTo(Alias_Drevis.GetActorRef())
AnimaCollegeLectureOngoing_2.SetValueInt(1)
AnimaCurrentLecture.SetValueInt(1)
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_13
Function Fragment_13()
;BEGIN CODE
Debug.Trace("Anima: CollegeLectures Stage 50")
Alias_CurrentTeacher.ForceRefTo(Alias_Colette.GetActorRef())
AnimaCollegeLectureOngoing.SetValueInt(1)
AnimaCurrentLecture.SetValueInt(4)
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_19
Function Fragment_19()
;BEGIN CODE
Debug.Trace("Anima: CollegeLectures Stage 80")
Alias_CurrentTeacher.ForceRefTo(Alias_Phinis.GetActorRef())
AnimaCollegeLectureOngoing_2.SetValueInt(1)
AnimaCurrentLecture.SetValueInt(7)
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_11
Function Fragment_11()
;BEGIN CODE
Debug.Trace("Anima: CollegeLectures Stage 40")
Alias_CurrentTeacher.ForceRefTo(Alias_Faralda.GetActorRef())
AnimaCollegeLectureOngoing_2.SetValueInt(1)
AnimaCurrentLecture.SetValueInt(3)
;END CODE
EndFunction
;END FRAGMENT

;BEGIN FRAGMENT Fragment_2
Function Fragment_2()
;BEGIN CODE
Debug.Trace("Anima:CollegeLecture: Stage 100")
Alias_CurrentTeacher.Clear()
AnimaCollegeLectureOngoing.SetValueInt(0)
AnimaCollegeLectureOngoing_2.SetValueInt(0)
AnimaCollegeLectureStarted.SetValueInt(0)
;END CODE
EndFunction
;END FRAGMENT

;END FRAGMENT CODE - Do not edit anything between this and the begin comment

GlobalVariable Property AnimaCollegeLectureOngoing  Auto  


GlobalVariable Property AnimaCollegeLectureStarted  Auto  

GlobalVariable Property AnimaCollegeLectureOngoing_2  Auto  

GlobalVariable Property AnimaCurrentLecture  Auto  
