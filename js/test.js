//
// Test script runs on 'test.html' page.
//

let tree;

(async () => {

    // Set up parser.
    await TreeSitter.init();
    const parser = new TreeSitter();

    const newLanguageName = "tlaplus";
    const url = `${LANGUAGE_BASE_URL}/tree-sitter-${newLanguageName}.wasm`
    let lang = await TreeSitter.Language.load(url);
    parser.setLanguage(lang);

    let tree = null;

    // Do two arrays (treated as sets) contain the same elements.
    function arrEq(a1,a2){
        let a1Uniq = _.uniqWith(a1, _.isEqual)
        let a2Uniq = _.uniqWith(a2, _.isEqual)

        let sameSize = a1Uniq.length === a2Uniq.length;
        let sameEls = _.every(a1Uniq, (s) => _.find(a2Uniq, t => _.isEqual(s,t)));
        return sameSize && sameEls;
    }

    function testStateGen(testId, specText, initExpected, nextExpected){
        let div;
        tree = null;
        const newTree = parser.parse(specText + "\n", tree);
        let ret = generateStates(newTree);
        
        // Test correct initial states.
        let initStates = ret["initStates"]
        const passInit = arrEq(initExpected, initStates);

        // Test correct next states.
        let nextStates = ret["nextStates"].map(c => c["state"]);
        const passNext = arrEq(nextExpected, nextStates);

        let testHeader = document.createElement("h2");
        testHeader.innerText = "Test: " + testId + "";
        let specCodeDiv = document.createElement("div");
        specCodeDiv.style = "background-color:rgb(230,230,230);width:70%;margin-bottom:15px;";
        let specCode = document.createElement("code");
        specCode.innerText = specText;
        testsDiv.appendChild(testHeader);
        specCodeDiv.appendChild(specCode);
        testsDiv.appendChild(specCodeDiv);

        // Print expected initial states.
        div = document.createElement("div");
        div.innerHTML = "<b>Initial states expected:</b>"
        testsDiv.appendChild(div);
        for(const state of initExpected){
            let stateDiv = document.createElement("div");
            stateDiv.innerText = JSON.stringify(state);
            testsDiv.appendChild(stateDiv);
        }

        // Print generated initial states.
        div = document.createElement("div");
        div.innerHTML = "<b>Initial states actual:</b>"
        testsDiv.appendChild(div);
        for(const state of ret["initStates"]){
            let stateDiv = document.createElement("div");
            stateDiv.innerText = JSON.stringify(state);
            testsDiv.appendChild(stateDiv);
        }

        // Print expected next states.
        div = document.createElement("div");
        div.innerHTML = "<b>Next states expected:</b>"
        testsDiv.appendChild(div);
        for(const state of nextExpected){
            let stateDiv = document.createElement("div");
            stateDiv.innerText = JSON.stringify(state);
            testsDiv.appendChild(stateDiv);
        }

        // Print next states.
        div = document.createElement("div");
        div.innerHTML = "<b>Next states actual:</b>"
        testsDiv.appendChild(div);
        for(const state of nextStates){
            let stateDiv = document.createElement("div");
            stateDiv.innerText = JSON.stringify(state);
            testsDiv.appendChild(stateDiv);
        }

        let statusText = "Init: " + (passInit ? "PASS &#10003" : "FAIL &#10007");
        let statusColor = passInit ? "green" : "red";
        div = document.createElement("div");
        div.innerHTML = statusText;
        div.style = "font-weight: bold; color:" + statusColor;
        testsDiv.appendChild(div);

        statusText = "Next: " + (passNext ? "PASS &#10003" : "FAIL &#10007");
        statusColor = passNext ? "green" : "red";
        div = document.createElement("div");
        div.innerHTML = statusText;
        div.style = "font-weight: bold; color:" + statusColor;
        testsDiv.appendChild(div);
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
    initExpected = [{x:1}];
    nextExpected = [{"x":1, "x'":2}]
    testStateGen("simple-spec1", spec1, initExpected, nextExpected);
}

function simple_spec2(){
    let spec2 = `----------------------- MODULE Test ------------------------
    VARIABLE x
    Init == x = 1 \\/ x = 2 
    Next == x' = 2
    ====`;
    initExpected = [{x:1}, {x:2}];    
    nextExpected = [{"x":1, "x'":2}]
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
    initExpected = [{x:1,y:3},{x:2,y:3},{x:1,y:4},{x:2,y:4}];
    nextExpected = [
        {"x":1, "y":3, "x'":2, "y'": 2}, 
        {"x":1, "y":4, "x'":2, "y'": 2}, 
        {"x":2, "y":3, "x'":2, "y'": 2}, 
        {"x":2, "y":4, "x'":2, "y'": 2}, 
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
    testStateGen("simple_lockserver_nodefs", speclockserver, initExpected, nextExpected);
}

tests = {
    "simple-spec1": simple_spec1,
    "simple-spec2": simple_spec2,
    "simple-spec3": simple_spec3,
    "simple-spec4": simple_spec4,
    "simple-spec5": simple_spec5,
    "simple_lockserver_nodefs": simple_lockserver_nodefs
}

const start = performance.now();

const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());
const arg = params["test"];

// Allow URL arg to choose which test to run.
let testNames;
if(arg==="all" || arg === undefined){
    testNames = Object.keys(tests);
    testNames.sort();
} else{
    testNames = [arg];
}

// Run the specified tests.
for(const name of testNames){
    tests[name]();
}


// Measure test duration.
const duration = (performance.now() - start).toFixed(1);
console.log(`All tests ran in ${duration}ms`);

})();