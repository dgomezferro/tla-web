----------------------- MODULE simple5 ------------------------
VARIABLE x
VARIABLE y
Init == 
    /\ x = 1 \/ x = 2
    /\ y = 3 \/ y = 6

Next ==
    \/ x = 0 /\ x' = 99 /\ y' = 88
    \/ x = 2 /\ x' = 209 /\ y' = 288
====