scriptname SubtitleWatcher extends Quest

Event OnInit()
    While True
        AnimaSKSE.WatchSubtitles()
        Utility.Wait(2)
    EndWhile
EndEvent