---- MODULE simple_quant_multi ----
EXTENDS Naturals
\* See https://github.com/will62794/tla-web/issues/17.

VARIABLE x, y

Init == 
    /\ x = 0
    /\ y = 0

Next == 
    \/ \E i,j \in 1..3:
    	/\ x' = i
        /\ y' = j
    \/ \E i \in 4..5, j \in 7..8 :
    	/\ x' = i
        /\ y' = j   
    \/ \E i,j \in 4..5, u,v \in 7..8 :
    	/\ x' \in {i,u}
        /\ y' \in {j,v}    

====