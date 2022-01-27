//
// Test script runs on 'test.html' page.
//

let tree;
let parser;

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
function testStateGraphEquiv(testId, stateGraph, specPath){

    $.get(specPath).then(specText => {
        let testsDiv = document.getElementById("tests");

        // Show the spec text and test name first.
        let testHeader = document.createElement("h3");
        testHeader.innerText = "Test: " + testId + "";
        // testHeader.style = "cursor:pointer";
        // testHeader.setAttribute("onclick", `toggleTestDetails(\"${testId}\")`);
        testsDiv.appendChild(testHeader);

        tree = null;
        const newTree = parser.parse(specText + "\n", tree);
        
        // Test correct initial states.
        // let initStates = computeInitStates(newTree);
        let reachable = computeReachableStates(newTree);
        // console.log("spec5 init", initStates);
        let reachableTLC = stateGraph["states"].map(s => s["val"]);
        console.log("spec5 reachable:", reachable);
        console.log("spec5 TLC oracle:", reachableTLC);
        console.log("eq:", arrEq(reachable, reachableTLC));
        let areEquiv = arrEq(reachable, reachableTLC);
        console.assert(areEquiv);

        let statusText = (areEquiv ? "PASS &#10003" : "FAIL &#10007");
        let statusColor = areEquiv ? "green" : "red";
        div = document.createElement("div");
        div.innerHTML = statusText;
        div.style = "font-weight: bold; color:" + statusColor;
        testsDiv.appendChild(div);
    })
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
        let testHeader = document.createElement("h3");
        testHeader.innerText = "Test: " + testId + "";
        testHeader.style = "cursor:pointer";
        testHeader.setAttribute("onclick", `toggleTestDetails(\"${testId}\")`);
        testsDiv.appendChild(testHeader);

        let detailedResultsDiv = document.createElement("div");
        detailedResultsDiv.id = "test_result_details_" + testId;

        let specCodeDiv = document.createElement("div");
        specCodeDiv.style = "background-color:rgb(230,230,230);width:70%;margin-bottom:15px;";
        let specCode = document.createElement("code");
        specCode.innerText = specText;
        specCodeDiv.appendChild(specCode);
        detailedResultsDiv.appendChild(specCodeDiv);

        tree = null;
        const newTree = parser.parse(specText + "\n", tree);
        
        // Test correct initial states.
        let initStates = computeInitStates(newTree);
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
            let nextStates = computeNextStates(newTree, initStates).map(c => c["state"]);
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
        detailedResultsDiv.setAttribute("hidden", true);
        testsDiv.appendChild(detailedResultsDiv);

        // Show the outcome of the test (PASS/FAIL).
        let statusText = "Init: " + (passInit ? "PASS &#10003" : "FAIL &#10007");
        let statusColor = passInit ? "green" : "red";
        div = document.createElement("div");
        div.innerHTML = statusText;
        div.style = "font-weight: bold; color:" + statusColor;
        testsDiv.appendChild(div);

        if(nextExpected!==null){
            statusText = "Next: " + (passNext ? "PASS &#10003" : "FAIL &#10007");
            statusColor = passNext ? "green" : "red";
            div = document.createElement("div");
            div.innerHTML = statusText;
            div.style = "font-weight: bold; color:" + statusColor;
            testsDiv.appendChild(div);
        }
    }



let testsDiv = document.getElementById("tests");
let initExpected;
let nextExpected;

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

function testTLCEquiv(testId, specName){
    let specStatesPath = `./specs/with_state_graphs/${specName}.json`;
    res = $.get(specStatesPath).then(data => {
        let specPath = `./specs/with_state_graphs/${specName}.tla`;
        testStateGraphEquiv(testId, data, specPath);
    });      
}


function testPaxosNext(testId, specName){
    let specStatesPath = `./specs/Paxos.tla`;
    console.log("Running Paxos state generation benchmark.");
    res = $.get(specStatesPath).then(data => {
        specText = data;

        tree = null;
        const newTree = parser.parse(specText + "\n", tree);

        let start = performance.now();
        let initStates = computeInitStates(newTree);
        const initDuration = (performance.now() - start).toFixed(1);

        start = performance.now();
        console.log("Computing next states for Paxos.");
        let nextStates = computeNextStates(newTree, initStates).map(c => c["state"]);
        const nextDuration = (performance.now() - start).toFixed(1);
        
        console.log(`Paxos init state evaluation ran in ${initDuration}ms`);
        console.log(`Paxos next state evaluation ran in ${nextDuration}ms`);
    });      
}


tests = {
    // "mldr-init-only-tlc-equiv": (() => testTLCEquiv("mldr-init-only-tlc-equiv", "mldr_init_only"))
    "paxos-next": testPaxosNext
}

const start = performance.now();

const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());
const arg = params["test"];

// Allow URL arg to choose which test to run.
let testNames;
if(arg==="all" || arg === undefined){
    testNames = Object.keys(tests);
} else{
    testNames = [arg];
}

// Run the specified tests.
for(const name of testNames){
    console.log(`Running test '${name}'`);
    tests[name]();
}


// Measure test duration.
const duration = (performance.now() - start).toFixed(1);
console.log(`All tests ran in ${duration}ms`);
let durationDiv = document.getElementById("test-duration");
durationDiv.style="margin-top:25px;";
durationDiv.innerText = `All ${testNames.length} tests ran in ${duration}ms`;

})();