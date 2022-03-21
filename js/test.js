//
// Test script runs on 'test.html' page.
//

let tree;
let parser;

// Parse URL params;
const urlSearchParams = new URLSearchParams(window.location.search);
const urlParams = Object.fromEntries(urlSearchParams.entries());
let enableEvalTracing = parseInt(urlParams["debug"]);

function toggleTestDetails(testId){

    // alert("details"+testId);
    let resultsDivId = "test_result_details_" + testId;
    let testResultsDiv = document.getElementById(resultsDivId);
    let isHidden = testResultsDiv.getAttribute("hidden");
    // Hide.
    if(isHidden===null){
        testResultsDiv.setAttribute("hidden", true);
    } else{
        // Unhide.
        testResultsDiv.removeAttribute("hidden");
    }
    console.log(isHidden);

}

// Do two arrays (treated as sets) contain the same elements.
function arrEq(a1,a2){
    let a1Uniq = _.uniqWith(a1, _.isEqual)
    let a2Uniq = _.uniqWith(a2, _.isEqual)

    let sameSize = a1Uniq.length === a2Uniq.length;
    let sameEls = _.every(a1Uniq, (s) => _.find(a2Uniq, t => _.isEqual(s,t)));
    return sameSize && sameEls;
}

// Check equivalence of given state graph and state graph
// generated by given spec.
function testStateGraphEquiv(testId, stateGraph, specText){

    let testsDiv = document.getElementById("tests");

    // Show the spec text and test name first.
    let testHeader = document.createElement("a");
    testHeader.innerText = "Test: " + testId + "";
    if(!urlParams.hasOwnProperty("test")){
        testHeader.href = "?test=" + testId;
    } else{
        testHeader.setAttribute("onclick", `toggleTestDetails(\"${testId}\")`);
    }
    // testHeader.style = "cursor:pointer";
    // testHeader.setAttribute("onclick", `toggleTestDetails(\"${testId}\")`);
    testsDiv.appendChild(testHeader);

    // Test correct states. 
    // TODO: test correct edges as well.
    let interp = new TlaInterpreter();
    let reachable = interp.computeReachableStates(parseSpec(specText))["states"];
    let reachableTLC = stateGraph["states"].map(s => s["val"]);

    reachable = reachable.map(s => s.toJSONITF());
    
    console.log("spec reachable:", reachable);
    console.log("spec reachable TLC oracle:", reachableTLC);
    console.log("eq:", arrEq(reachable, reachableTLC));
    
    // The serialized state graphs from TLC are putput in informal trace
    // format (ITF), so we use that as a standard to compare states from the
    // JS intepreter and the states generated by TLC.
    let areEquiv = arrEq(reachable, reachableTLC);

    let statusText = (areEquiv ? "PASS &#10003" : "FAIL &#10007");
    let statusColor = areEquiv ? "green" : "red";
    div = document.createElement("div");
    div.innerHTML = statusText;
    div.style = "font-weight: bold; color:" + statusColor;
    testsDiv.appendChild(div);

    if(!areEquiv && urlParams.hasOwnProperty("test")){
        infoDiv = document.createElement("div");
        infoDiv.style="width:100%";
        computedDiv = document.createElement("div");
        computedDiv.style = "float:left;border:solid;padding:4px;margin:3px; min-width:20%;";
        computedDiv.innerHTML = "<h4>Computed by JS, " + reachable.length + " reachable states</h4>";
        computedDiv.innerHTML += "<pre>" + JSON.stringify(reachable, null, 2) + "</pre>"
        oracleDiv = document.createElement("div");
        oracleDiv.style="float:left;border:solid;padding:4px;margin:3px; min-width:20%;";
        oracleDiv.innerHTML = "<h4>Computed by TLC, " + reachableTLC.length + " reachable states</h4>";
        oracleDiv.innerHTML += "<pre>" + JSON.stringify(reachableTLC,null, 2) + "</pre>";
        infoDiv.appendChild(computedDiv);
        infoDiv.appendChild(oracleDiv);
        testsDiv.appendChild(infoDiv);
    }

}

(async () => {

    // Set up parser.
    await TreeSitter.init();
    parser = new TreeSitter();

    const newLanguageName = "tlaplus";
    const url = `${LANGUAGE_BASE_URL}/tree-sitter-${newLanguageName}.wasm`
    let lang = await TreeSitter.Language.load(url);
    parser.setLanguage(lang);

    let tree = null;

    function testStateGen(testId, specText, initExpected, nextExpected){
        let div;

        // Show the spec text and test name first.
        let testHeader = document.createElement("a");
        testHeader.innerText = "Test: " + testId + "";
        testHeader.style = "cursor:pointer";
        if(!urlParams.hasOwnProperty("test")){
            testHeader.href = "?test=" + testId;
        } else{
            testHeader.setAttribute("onclick", `toggleTestDetails(\"${testId}\")`);
        }
        testsDiv.appendChild(testHeader);

        let detailedResultsDiv = document.createElement("div");
        detailedResultsDiv.id = "test_result_details_" + testId;

        let specCodeDiv = document.createElement("div");
        specCodeDiv.style = "background-color:rgb(230,230,230);width:70%;margin-bottom:15px;";
        let specCode = document.createElement("code");
        specCode.innerText = specText;
        specCodeDiv.appendChild(specCode);
        detailedResultsDiv.appendChild(specCodeDiv);

        // tree = null;
        // let newTree = parser.parse(specText + "\n", tree);
        // let rewrites = genSyntaxRewrites(newTree);
        // console.log(rewrites);
        // let newText = applySyntaxRewrites(specText, rewrites);
        // console.log(newText);
        // newTree = parser.parse(newText + "\n", tree);

        // return;
        let treeObjs = parseSpec(specText);
        
        // Test correct initial states.
        let interp = new TlaInterpreter();
        let initStates = interp.computeInitStates(treeObjs, {});
        const passInit = arrEq(initExpected, initStates);

        // Print expected initial states.
        div = document.createElement("div");
        div.innerHTML = "<b>Initial states expected:</b>"
        detailedResultsDiv.appendChild(div);
        for(const state of initExpected){
            let stateDiv = document.createElement("div");
            stateDiv.innerText = JSON.stringify(state);
            detailedResultsDiv.appendChild(stateDiv);
        }

        // Print generated initial states.
        div = document.createElement("div");
        div.innerHTML = "<b>Initial states actual:</b>"
        detailedResultsDiv.appendChild(div);
        for(const state of initStates){
            let stateDiv = document.createElement("div");
            stateDiv.innerText = JSON.stringify(state);
            detailedResultsDiv.appendChild(stateDiv);
        }

        // If given expected next states are null, don't check correctness of next states. 
        let passNext;
        if(nextExpected!==null){
            // Test correct next states.
            let nextStates = interp.computeNextStates(treeObjs, {}, initStates).map(c => c["state"]);
            passNext = arrEq(nextExpected, nextStates);

            // Print expected next states.
            div = document.createElement("div");
            div.innerHTML = "<b>Next states expected:</b>"
            detailedResultsDiv.appendChild(div);
            for(const state of nextExpected){
                let stateDiv = document.createElement("div");
                stateDiv.innerText = JSON.stringify(state);
                detailedResultsDiv.appendChild(stateDiv);
            }

            // Print next states.
            div = document.createElement("div");
            div.innerHTML = "<b>Next states actual:</b>"
            detailedResultsDiv.appendChild(div);
            for(const state of nextStates){
                let stateDiv = document.createElement("div");
                stateDiv.innerText = JSON.stringify(state);
                detailedResultsDiv.appendChild(stateDiv);
            }
        }

        // Append the detailed results and make it hidden by default.
        // TODO: Re-enable hiding test results by default once it can work
        // separately for single tests and all tests.
        let hideByDefault = !urlParams.hasOwnProperty("test");
        if(hideByDefault){
            detailedResultsDiv.setAttribute("hidden", true);
        }
        testsDiv.appendChild(detailedResultsDiv);

        let statusDiv = document.createElement("div");
        statusDiv.innerHTML = "";

        // Show the outcome of the test (PASS/FAIL).
        // &#10003, &#10007
        let statusText = "Init:" + (passInit ? "PASS" : "FAIL");
        let statusColor = passInit ? "green" : "red";
        initStatus = document.createElement("span");
        initStatus.innerHTML += statusText;
        initStatus.style = "margin-right:15px;font-weight: bold; color:" + statusColor;
        statusDiv.appendChild(initStatus);

        if(nextExpected!==null){
            statusText = "Next:" + (passNext ? "PASS" : "FAIL");
            statusColor = passNext ? "green" : "red";
            nextStatus = document.createElement("span");
            nextStatus.innerHTML += statusText;
            nextStatus.style = "font-weight: bold; color:" + statusColor;
            statusDiv.appendChild(nextStatus);
        }
        testsDiv.appendChild(statusDiv);

    }



let testsDiv = document.getElementById("tests");
let initExpected;
let nextExpected;

function simple_spec1(){
    let spec1 = `----------------------- MODULE Test ------------------------
    VARIABLE x
    Init == x = 1 
    Next == x' = 2
    ====`;
    initExpected = [{x:new IntValue(1)}];
    nextExpected = [{"x":new IntValue(1), "x'":new IntValue(2)}]
    testStateGen("simple-spec1", spec1, initExpected, nextExpected);
}

function simple_spec2(){
    let spec2 = `----------------------- MODULE Test ------------------------
    VARIABLE x
    Init == x = 1 \\/ x = 2 
    Next == x' = 2
    ====`;
    initExpected = [{x:new IntValue(1)}, {x:new IntValue(2)}];    
    nextExpected = [{"x":new IntValue(1), "x'":new IntValue(2)}]
    testStateGen("simple-spec2", spec2, initExpected, nextExpected);
}

function simple_spec3(){
    let spec3 = `----------------------- MODULE Test ------------------------
    VARIABLE x
    VARIABLE y
    Init == 
        /\\ x = 1 \\/ x = 2 
        /\\ y = 3 \\/ y = 4
    
    Next == x' = 2 /\\ y' = 2
    ====`;
    initExpected = [{x:new IntValue(1),y:new IntValue(3)},
                    {x:new IntValue(2),y:new IntValue(3)},
                    {x:new IntValue(1),y:new IntValue(4)},
                    {x:new IntValue(2),y:new IntValue(4)}];
    nextExpected = [
        {"x":new IntValue(1), "y":new IntValue(3), "x'":new IntValue(2), "y'": new IntValue(2)}, 
        {"x":new IntValue(1), "y":new IntValue(4), "x'":new IntValue(2), "y'": new IntValue(2)}, 
        {"x":new IntValue(2), "y":new IntValue(3), "x'":new IntValue(2), "y'": new IntValue(2)}, 
        {"x":new IntValue(2), "y":new IntValue(4), "x'":new IntValue(2), "y'": new IntValue(2)}, 
    ]
    testStateGen("simple-spec3", spec3, initExpected, nextExpected);
}

function simple_spec4(){
    let spec4 = `----------------------- MODULE Test ------------------------
    VARIABLE x
    Init == 
        /\\ x = 1 \\/ x = 2 
    
    Next == x = 1 /\\ x' = 3
    ====`;
    initExpected = [{x:1},{x:2}];
    nextExpected = [
        {"x":1, "x'":3},
    ]
    testStateGen("simple-spec4", spec4, initExpected, nextExpected);
}

function simple_spec4a(){
    let spec4a = `----------------------- MODULE Test ------------------------
    VARIABLE x
    Init == 
        /\\ x = 1 \\/ x = 2 
    
    Next == 
        /\\ x = 1 
        /\\ x' = 3
    ====`;
    initExpected = [{x:1},{x:2}];
    nextExpected = [
        {"x":1, "x'":3},
    ]
    testStateGen("simple-spec4a", spec4a, initExpected, nextExpected);
}

function simple_spec5(){
    let spec5 = `----------------------- MODULE Test ------------------------
    VARIABLE x
    VARIABLE y
    Init == 
        /\\ x = 1 \\/ x = 2 
        /\\ y = 3 \\/ y = 4
    
    Next == x = 1 /\\ x' = 2 /\\ y' = 2
    ====`;
    initExpected = [{x:1,y:3},{x:2,y:3},{x:1,y:4},{x:2,y:4}];
    nextExpected = [
        {"x":1, "y":3, "x'":2, "y'": 2}, 
        {"x":1, "y":4, "x'":2, "y'": 2}, 
    ]
    testStateGen("simple-spec5", spec5, initExpected, nextExpected);
}

function simple_lockserver_nodefs(){
    let speclockserver = `---- MODULE lockserver_nodefs ----
    EXTENDS TLC, Naturals
    
    VARIABLE semaphore
    VARIABLE clientlocks
    
    Init == 
        /\\ semaphore = [i \\in {0,1} |-> TRUE]
        /\\ clientlocks = [i \\in {88,99} |-> {}]
    
    Next == 
        \\/ \\E c \\in {88,99}, s \\in {0,1} : 
            /\\ semaphore[s] = TRUE
            /\\ clientlocks' = [clientlocks EXCEPT ![c] = clientlocks[c] \\cup {s}]
            /\\ semaphore' = [semaphore EXCEPT ![s] = FALSE]
        \\/ \\E c \\in {88,99}, s \\in {0,1} : 
            /\\ s \\in clientlocks[c]
            /\\ clientlocks' = [clientlocks EXCEPT ![c] = clientlocks[c] \\ {s}]
            /\\ semaphore' = [semaphore EXCEPT ![s] = TRUE]
    
    ====`;
    console.log(speclockserver);
    initExpected = [
        {semaphore:{0:true,1:true}, clientlocks:{88:[], 99:[]}}
    ];
    nextExpected = [
        {semaphore: {0:true,1:true}, clientlocks: {88:[], 99:[]}, "semaphore'": {0:false,1:true}, "clientlocks'": {88:[0], 99:[]}},
        {semaphore: {0:true,1:true}, clientlocks: {88:[], 99:[]}, "semaphore'": {0:false,1:true}, "clientlocks'": {88:[], 99:[0]}},
        {semaphore: {0:true,1:true}, clientlocks: {88:[], 99:[]}, "semaphore'": {0:true,1:false}, "clientlocks'": {88:[], 99:[1]}},
        {semaphore: {0:true,1:true}, clientlocks: {88:[], 99:[]}, "semaphore'": {0:true,1:false}, "clientlocks'": {88:[1], 99:[]}},
    ]
    testStateGen("simple-lockserver-nodefs", speclockserver, initExpected, nextExpected);
}

function simple_lockserver_withdefs(){
    let speclockserver = `---- MODULE lockserver_withdefs ----
    EXTENDS TLC, Naturals
    
    VARIABLE semaphore
    VARIABLE clientlocks
    
    Server == {0,1}
    Client == {88,99}

    Init == 
        /\\ semaphore = [i \\in Server |-> TRUE]
        /\\ clientlocks = [i \\in Client |-> {}]
    
    Next == 
        \\/ \\E c \\in Client, s \\in Server : 
            /\\ semaphore[s] = TRUE
            /\\ clientlocks' = [clientlocks EXCEPT ![c] = clientlocks[c] \\cup {s}]
            /\\ semaphore' = [semaphore EXCEPT ![s] = FALSE]
        \\/ \\E c \\in Client, s \\in Server : 
            /\\ s \\in clientlocks[c]
            /\\ clientlocks' = [clientlocks EXCEPT ![c] = clientlocks[c] \\ {s}]
            /\\ semaphore' = [semaphore EXCEPT ![s] = TRUE]
    
    ====`;
    console.log(speclockserver);
    initExpected = [
        {semaphore:{0:true,1:true}, clientlocks:{88:[], 99:[]}}
    ];
    nextExpected = [
        {semaphore: {0:true,1:true}, clientlocks: {88:[], 99:[]}, "semaphore'": {0:false,1:true}, "clientlocks'": {88:[0], 99:[]}},
        {semaphore: {0:true,1:true}, clientlocks: {88:[], 99:[]}, "semaphore'": {0:false,1:true}, "clientlocks'": {88:[], 99:[0]}},
        {semaphore: {0:true,1:true}, clientlocks: {88:[], 99:[]}, "semaphore'": {0:true,1:false}, "clientlocks'": {88:[], 99:[1]}},
        {semaphore: {0:true,1:true}, clientlocks: {88:[], 99:[]}, "semaphore'": {0:true,1:false}, "clientlocks'": {88:[1], 99:[]}},
    ]
    testStateGen("simple-lockserver-withdefs", speclockserver, initExpected, nextExpected);
}

// (*
//     /\\ i \\in voteQuorum
//     /\\ currentTerm' = [s \\in {44,55,66} |-> IF s \\in voteQuorum THEN currentTerm[i] + 1 ELSE currentTerm[s]]
//     /\\ state' = [s \\in {44,55,66} |->
//                 IF s = i THEN "Primary"
//                 ELSE IF s \\in voteQuorum THEN "Secondary"
//                 ELSE state[s]]
//     /\\ configTerm' = [configTerm EXCEPT ![i] = currentTerm[i] + 1]
//     /\\ UNCHANGED <<config, configVersion>>  *)


// /\\ i \\in config[i]
// \\E i \\in {44,55,66} : 
        
let specmldr1 = `---- MODULE mldr ----
EXTENDS TLC, Naturals

VARIABLE currentTerm
VARIABLE state
VARIABLE config

Init == 
    /\\ currentTerm = [i \\in {44,55} |-> 0]
    /\\ state       = [i \\in {44,55} |-> "Secondary"]
    /\\ \\E initConfig \\in SUBSET {44,55} : initConfig # {} /\\ config = [i \\in {44,55} |-> initConfig]

Next == 
    \\/ \\E i \\in {44,55} : 
        \\E voteQuorum \\in {S \\in SUBSET config[i] : Cardinality(S) * 2 > Cardinality(config[i])} : 
            /\\ i \\in config[i]
            /\\ i \\in voteQuorum
            /\\ currentTerm' = [s \\in {44,55} |-> IF s \\in voteQuorum THEN currentTerm[i] + 1 ELSE currentTerm[s]]
            /\\ state' = [s \\in {44,55} |-> IF s = i THEN "Primary" ELSE "Secondary"]
            /\\ config' = config

====`;

let mldrInitExpected = [
    {   "currentTerm":{"44":0,"55":0},
        "state":{"44":"Secondary","55":"Secondary"},
        "config":{"44":[44],"55":[44]}
    },
    {   "currentTerm":{"44":0,"55":0},
        "state":{"44":"Secondary","55":"Secondary"},
        "config":{"44":[44,55],"55":[44,55]}
    },
    {   "currentTerm":{"44":0,"55":0},
        "state":{"44":"Secondary","55":"Secondary"},
        "config":{"44":[55],"55":[55]}
    },
];

// IF s \\in voteQuorum THEN "Secondary" ELSE state[s]]


// /\\ \\A v \\in voteQuorum : CanVoteForConfig(v, i, currentTerm[i] + 1)
function mldr_init(){
    // TODO: Will again have to contend with set vs. list ordering issues eventually.
    testStateGen("mldr-init", specmldr1, mldrInitExpected, null);
}

function mldr_next(){
    let mldrNextExpected = [
        {   "currentTerm":{"44":0,"55":0},
            "state":{"44":"Secondary","55":"Secondary"},
            "config":{"44":[44],"55":[44]},
            "currentTerm'":{"44":1,"55":0},
            "state'":{"44":"Primary","55":"Secondary"},
            "config'":{"44":[44],"55":[44]}
        },
        {   "currentTerm":{"44":0,"55":0},
            "state":{"44":"Secondary","55":"Secondary"},
            "config":{"44":[55],"55":[55]},
            "currentTerm'":{"44":0,"55":1},
            "state'":{"44":"Secondary","55":"Primary"},
            "config'":{"44":[55],"55":[55]}
        },
        {   "currentTerm":{"44":0,"55":0},
            "state":{"44":"Secondary","55":"Secondary"},
            "config":{"44":[44,55],"55":[44,55]},
            "currentTerm'":{"44":1,"55":1},
            "state'":{"44":"Primary","55":"Secondary"},
            "config'":{"44":[44,55],"55":[44,55]}
        },
        {   "currentTerm":{"44":0,"55":0},
            "state":{"44":"Secondary","55":"Secondary"},
            "config":{"44":[44,55],"55":[44,55]},
            "currentTerm'":{"44":1,"55":1},
            "state'":{"44":"Secondary","55":"Primary"},
            "config'":{"44":[44,55],"55":[44,55]}
        },
    ];
    testStateGen("mldr-next", specmldr1, mldrInitExpected, mldrNextExpected);
}

function tuple_literal(){
    let spec = `---- MODULE tuple_literal ----
    EXTENDS TLC, Naturals
    
    VARIABLE x

    Init == x = <<1,2,3>>
    Next == x' = x
    
    ====`;
    initExpected = [
        {"x": [1,2,3]},
    ];
    testStateGen("tuple_literal", spec, initExpected, null);    
}

function multivar_decl(){
    let spec = `---- MODULE multivar_decl ----
    EXTENDS TLC, Naturals
    
    VARIABLE x,y

    Init == x = 0 /\\ y = 1
    Next == x' = x /\\ y' = y
    
    ====`;
    initExpected = [
        {"x": 0, "y": 1},
    ];
    testStateGen("multivar_decl", spec, initExpected, null);    
}

// TODO: Enable this test.
function multiconst_decl(){
    let spec = `---- MODULE multiconst_decl ----
    EXTENDS TLC, Naturals
    
    CONSTANT A,B
    VARIABLE x

    Init == x = 0
    Next == x' = x
    
    ====`;
    initExpected = [
        {"x": 0},
    ];
    testStateGen("multiconst_decl", spec, initExpected, null);    
}

function set_dot_notation(){
    let spec = `---- MODULE set_dot_notation ----
    EXTENDS TLC, Naturals
    
    VARIABLE x

    Init == x = 1..3
    Next == x' = x
    
    ====`;
    initExpected = [
        {"x": [1,2,3]},
    ];
    testStateGen("set_dot_notation", spec, initExpected, null);    
}

function set_literals(){
    let spec = `---- MODULE set_literals ----
    EXTENDS TLC, Naturals
    
    VARIABLE x
    
    Init == x = <<{1,2,3}, {1,{1,2}}, {1} \\cup {{1,2}}>>
    Next == x' = x
    
    ====`;
    initExpected = [
        {"x": [[1,2,3], [1,[1,2]], [1,[1,2]]]}
    ];
    testStateGen("set_literals", spec, initExpected, null);    
}

function set_inclusion(){
    let spec = `---- MODULE set_inclusion ----
    EXTENDS TLC, Naturals
    
    VARIABLE x
    v == {1,2} \\in {{1,2}}
    Init == x = v
    Next == x' = x
    
    ====`;
    initExpected = [
        {"x": true}
    ];
    testStateGen("set_inclusion", spec, initExpected, null);    
}

function set_notin(){
    let spec = `---- MODULE set_notin ----
    EXTENDS TLC, Naturals
    
    VARIABLE x
    v == 1 \\notin {1,2,3}

    Init == x = v
    Next == x' = x
    
    ====`;
    initExpected = [
        {"x": false}
    ];
    testStateGen("set_notin", spec, initExpected, null);    
}

function seq_append(){
    let spec = `---- MODULE seq_append ----
    EXTENDS TLC, Naturals
    
    VARIABLE x

    Init == x = Append(<<1,2>>,3)
    Next == x' = x
    
    ====`;
    initExpected = [
        {"x": [1,2,3]},
    ];
    testStateGen("seq_append", spec, initExpected, null);    
}

function primed_tuple(){
    let spec = `---- MODULE primed_tuple ----
    EXTENDS TLC, Naturals
    
    VARIABLE x
    VARIABLE y

    Init == x = 0 /\\ y = 0
    Next == UNCHANGED <<x,y>>
    
    ====`;
    initExpected = [
        {"x": 0, "y": 0},
    ];
    nextExpected = [];
    testStateGen("primed_tuple", spec, initExpected, nextExpected);    
}

function bound_ops(){
    let spec = `---- MODULE bound_ops ----
    EXTENDS TLC, Naturals
    
    Add(a,b) == a + b
    Add5(c) == c + 5

    VARIABLE x

    Init == x = Add(3,Add5(6)) 
    Next == x' = x
    
    ====`;
    initExpected = [
        {"x": 14}
    ];
    testStateGen("bound_ops", spec, initExpected, null);    
}

function record_literal_eval(){
    let spec = `---- MODULE record_literal_eval ----
    EXTENDS TLC, Naturals
    
    VARIABLE x

    Init == 
    \\/ x = [a |-> "v1", b |-> "v2"]
    \\/ x = [a |-> "v1", b |-> "v2", c |-> "v3"]
    Next == x' = x
    
    ====`;
    initExpected = [
        {"x": {a:"v1", b:"v2"}},
        {"x": {a:"v1", b:"v2", c: "v3"}}
    ];
    testStateGen("record_literal_eval", spec, initExpected, null);    
}

function record_access_eval(){
    let spec = `---- MODULE record_literal_eval ----
    EXTENDS TLC, Naturals
    
    VARIABLE x

    rec == [a |-> "v1", b |-> "v2"]

    Init == x = rec.a \\/ x = rec.b
    Next == x' = x
    
    ====`;
    initExpected = [
        {"x": "v1"},
        {"x": "v2"}
    ];
    testStateGen("record_access_eval", spec, initExpected, null);    
}

function next_state_precond_disabled(){
    let spec = `---- MODULE next_state_precond_disabled ----
    EXTENDS TLC, Naturals
    
    VARIABLE x

    Init == x = 0
    Next == 
        /\\ x = 1 
        /\\ x > 0
        /\\ x' = 12 \\/ x' = 15
    
    ====`;
    initExpected = [
        {"x": 0}
    ];
    nextExpected = []
    testStateGen("next_state_precond_disabled", spec, initExpected, nextExpected);    
}

function unchanged_statement(){
    let spec = `---- MODULE unchanged_statement ----
    EXTENDS TLC, Naturals
    
    VARIABLE x
    VARIABLE y

    Init == x = 0 /\\ y = 0
    Next == 
        /\\ x' = x + 1
        /\\ UNCHANGED y
    ====`;
    initExpected = [
        {"x": 0, "y": 0}
    ];
    nextExpected = [{"x": 0, "y": 0, "x'": 1, "y'": 0}]
    testStateGen("unchanged_statement", spec, initExpected, nextExpected);    
}

function unchanged_statement_tuple(){
    let spec = `---- MODULE unchanged_statement_tuple ----
    EXTENDS TLC, Naturals
    
    VARIABLE x
    VARIABLE y
    VARIABLE z

    Init == x = 0 /\\ y = 0 /\\ z = 0
    Next == 
        /\\ x' = x + 1
        /\\ UNCHANGED <<y,z>>
    ====`;
    initExpected = [
        {"x": 0, "y": 0, "z": 0 }
    ];
    nextExpected = [{"x": 0, "y": 0, "z": 0, "x'": 1, "y'": 0, "z'": 0}]
    testStateGen("unchanged_statement_tuple", spec, initExpected, nextExpected);    
}

function comment_statements(){
    let spec = `---- MODULE comment_statements ----
    EXTENDS TLC, Naturals
    
    VARIABLE x
    VARIABLE y
    VARIABLE z

    Init == 
        /\\ x = 0 
        \\* a comment inline.
        /\\ y = 0 
        \\* a comment inline.
        /\\ z = 0
    Next == 
        /\\ x' = 1
        \\* a comment.
        /\\ y' = y \\* some comment.
        \\* another comment line.
        /\\ z' = z
    ====`;
    initExpected = [
        {"x": 0, "y": 0, "z": 0 }
    ];
    nextExpected = [{"x": 0, "y": 0, "z": 0, "x'": 1, "y'": 0, "z'": 0}]
    testStateGen("comment_statements", spec, initExpected, nextExpected);    
}

function simple5(){
    return testTLCEquiv("simple5");
}

// tests = [
    // "simple-spec1": simple_spec1,
    // "simple-spec2": simple_spec2,
    // "simple-spec3": simple_spec3,
    // "simple-spec4": simple_spec4,
    // "simple-spec4a": simple_spec4a,
    // "simple-spec5": simple_spec5,
    // "record_literal_eval": record_literal_eval,
    // "record_access_eval": record_access_eval,
    // "tuple_literal": tuple_literal,
    // "multivar_decl": multivar_decl,
    // "comment_statements": comment_statements,
    // "set_dot_notation": set_dot_notation,
    // "seq_append": seq_append,
    // "set_literals": set_literals,
    // "set_inclusion": set_inclusion,
    // "set_notin": set_notin,
    // "primed_tuple": primed_tuple,
    // "next_state_precond_disabled": next_state_precond_disabled,
    // "bound_ops": bound_ops,
    // "simple-lockserver-nodefs": simple_lockserver_nodefs,
    // "simple-lockserver-withdefs": simple_lockserver_withdefs,
    // "mldr-init": mldr_init,
    // "mldr-next": mldr_next,
    // "unchanged_statement": unchanged_statement,
    // "unchanged_statement_tuple": unchanged_statement_tuple,// # TODO: Enable this test.
    // ["simple1", (() => testTLCEquiv("simple-1", "simple1"))],
    // ["simple2", (() => testTLCEquiv("simple-2", "simple2"))],
    // ["simple3", (() => testTLCEquiv("simple-3", "simple3"))],
    // ["tla-expr-eval", (() => testTLCEquiv("tla-expr-eval", "tla_expr_eval"))],
    // ["simple5-tlc-equiv", (() => testTLCEquiv("simple5-tlc-equiv", "simple5"))],
    // ["mldr-init-only-tlc-equiv", (() => testTLCEquiv("mldr-init-only-tlc-equiv", "mldr_init_only"))]
// ]

// Set of specs whose reachable states we test for JS <-> TLC conformance.
tests = [
    "simple1",
    "simple2",
    "simple3",
    "simple5",
    "set_dot_notation",
    "record_literal_eval",
    "seq_append",
    "primed_tuple",
    "mldr_init_only",
    "tla_expr_eval"
]

const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());
const arg = params["test"];

// Allow URL arg to choose which test to run.
let testsToRun;
if(arg==="all" || arg === undefined){
    testsToRun = tests;
} else{
    testsToRun = tests.filter(t => t === arg);
}

function fetchTestSpec(test){
    let specStatesPath = `./specs/with_state_graphs/${test}.tla.json`;
    return $.get(specStatesPath).then(data => {
        let specPath = `./specs/with_state_graphs/${test}.tla`;
        return $.get(specPath).then(specText => {
            return [specText, data];
        });
    });
}

// Fetch all specs and state graphs first, then execute the tests.
let allReqs = testsToRun.map(fetchTestSpec);

$.when( ...allReqs).done(function ( ) {
    // console.log("ARGUMENTS:", arguments);
    const start = performance.now();

    // Run the specified tests.
    for(var i=0;i<testsToRun.length;i++){
        test = testsToRun[i];
        specText = arguments[i][0]
        specStateGraph = arguments[i][1]
        console.log(`Running test '${test}'`);
        testStateGraphEquiv(test, specStateGraph, specText);
    }

    // Measure test duration.
    const duration = (performance.now() - start).toFixed(1);
    console.log(`All tests ran in ${duration}ms`);
    let durationDiv = document.getElementById("test-duration");
    durationDiv.style="margin-top:25px;";
    durationDiv.innerText = `All ${testsToRun.length} tests ran in ${duration}ms`;
});

})();