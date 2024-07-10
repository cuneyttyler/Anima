scriptname SubtitleWatcher extends Quest

Event OnInit()
    While True
        InworldSKSE.WatchSubtitles()
        Utility.Wait(2)
    EndWhile
EndEvent