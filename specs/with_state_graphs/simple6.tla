----------------------- MODULE simple6 ------------------------
VARIABLE x
Init == x = [{1,2} -> {4,5}]
Next == x' = x
====