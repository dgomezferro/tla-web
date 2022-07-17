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
    console.log("arrEq a1:", a1);
    console.log("arrEq a1:", a2);
    let a1Uniq = _.uniqWith(a1, _.isEqual)
    let a2Uniq = _.uniqWith(a2, _.isEqual)

    console.log("arrEq a1 uniqwith:", a1);
    console.log("arrEq a2 uniqwith:", a2);

    let sameSize = a1Uniq.length === a2Uniq.length;
    if(!sameSize){
        return false;
    }
    let sameEls = _.every(a1Uniq, (s) => _.find(a2Uniq, t => _.isEqual(s,t)));
    return sameEls;
}

// Check equivalence of given state graph and state graph
// generated by given spec.
function testStateGraphEquiv(testId, stateGraph, specText, constvals){

    let testsDiv = document.getElementById("tests");
    let isSingleTest = urlParams.hasOwnProperty("test");

    // Show the spec text and test name first.
    let testHeader = document.createElement("div");
    testHeader.innerHTML = `<b>Test: <a href='?test=${testId}&debug=1'> ${testId} </a></b>`;
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
    let parsedSpec = parseSpec(specText);
    console.log("### TEST: Computing reachable states with JS interpreter")
    let reachable = interp.computeReachableStates(parsedSpec, constvals)["states"];

    // Construct a new spec with an initial state that is the disjunction of all
    // reachable states of the spec we're testing.
    let specVariables = parsedSpec["var_decls"];
    let objects = stateGraph["objects"];

    // Build the spec.
    let specOfTLCReachableStates = `----MODULE ${testId}_TLC_reachable----\n`;
    for(var kvar in specVariables){
        specOfTLCReachableStates += "VARIABLE " + kvar + "\n";
    }
    specOfTLCReachableStates += `Init == \n`;
    for(const obj of objects){
        if(!obj.hasOwnProperty("label")){
            continue;
        }
        // Retrieve the TLA state string and deal with some string escaping.
        let stateStr = obj["label"];
        stateStr = stateStr
                    .replaceAll("\\n"," ")
                    .replaceAll("\\\\","\\");
        let stateDisjunct = "  \\/ (" + stateStr + ")"
        specOfTLCReachableStates += stateDisjunct + "\n";
    }
    specOfTLCReachableStates += "Next == UNCHANGED <<" + Object.keys(specVariables).join(",") + ">>\n"
    specOfTLCReachableStates += "===="
    console.log("specOfTLCReachableStates");
    console.log(specOfTLCReachableStates);

    // Parse this generated spec and record its initial states, which should
    // correspond to the reachable states of the TLC state graph for the spec
    // we're testing.
    console.log("### TEST: Reconstructing reachable states of TLC state graph")
    enableEvalTracing = false; // turn off tracing here to avoid pollution of main eval logs.
    parsedTLCSpec = parseSpec(specOfTLCReachableStates);
    let reachableTLC = interp.computeReachableStates(parsedTLCSpec, constvals)["states"];

    // let reachableTLC = stateGraph["states"].map(s => s["val"]);
    // reachable = reachable.map(s => s.toJSONITF());
    
    console.log("spec reachable JS  :", reachable);
    console.log("spec reachable TLC :", reachableTLC);
    console.log("----------------------");
    console.log("eq:", arrEq(reachable, reachableTLC));

    let jsFingerprints = reachable.map(s => s.fingerprint());
    let tlcFingerprints = reachableTLC.map(s => s.fingerprint());
    let areEquiv = arrEq(jsFingerprints, tlcFingerprints);
    
    // TODO: Remove the ITF comparison logic.
    // The serialized state graphs from TLC are putput in informal trace
    // format (ITF), so we use that as a standard to compare states from the
    // JS intepreter and the states generated by TLC.
    // let areEquiv = arrEq(reachable, reachableTLC);

    let statusText = (areEquiv ? "PASS &#10003" : "FAIL &#10007");
    let statusColor = areEquiv ? "green" : "red";
    div = document.createElement("div");
    div.innerHTML = statusText;
    div.style = "margin-bottom:5px; font-weight: bold; color:" + statusColor;
    testsDiv.appendChild(div);

    // Show generated spec with reachable states for debugging single tests.
    if(isSingleTest){
        let genSpecBlock = document.createElement("div");
        genSpecBlock.style = "margin-top:10px;";
        // genSpecBlock.style = "margin-top:10px;border:solid;width:40%;";
        // genSpecBlock.innerHTML = "<div> TLC reachable states: </div>";
        genSpecBlock.innerHTML += "<pre>" + specOfTLCReachableStates + "</pre>";
        testsDiv.appendChild(genSpecBlock);
    }

    if(!areEquiv && urlParams.hasOwnProperty("test")){
        infoDiv = document.createElement("div");
        infoDiv.style="width:100%";
        computedDiv = document.createElement("div");
        computedDiv.style = "float:left;border:solid;padding:4px;margin:3px; min-width:20%;";
        computedDiv.innerHTML = "<h4>Computed by JS</h4>";
        computedDiv.innerHTML += reachable.length + " reachable states";
        for(const s of reachable){
            computedDiv.innerHTML += "<pre>" + s.toString() + "</pre>";
        }
        // computedDiv.innerHTML += "<pre>" + JSON.stringify(reachable, null, 2) + "</pre>"
        oracleDiv = document.createElement("div");
        oracleDiv.style="float:left;border:solid;padding:4px;margin:3px; min-width:20%;";
        oracleDiv.innerHTML = "<h4>Computed by TLC</h4>";
        oracleDiv.innerHTML += reachableTLC.length + " reachable states";
        // oracleDiv.innerHTML += "<pre>" + JSON.stringify(reachableTLC,null, 2) + "</pre>";
        for(const s of reachableTLC){
            oracleDiv.innerHTML += "<pre>" + s.toString() + "</pre>";
        }
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

// Set of specs whose reachable states we test for JS <-> TLC conformance.
tests = [
    {"spec": "simple1", "constvals": undefined},
    {"spec": "simple1_multiline_block_comment", "constvals": undefined},
    {"spec": "simple2", "constvals": undefined},
    {"spec": "simple3", "constvals": undefined},
    {"spec": "simple5", "constvals": undefined},
    {"spec": "simple_negation", "constvals": undefined},
    {"spec": "simple_domain", "constvals": undefined},
    {"spec": "simple6", "constvals": undefined},
    {"spec": "simple7", "constvals": undefined},
    {"spec": "simple_subset", "constvals": undefined},
    {"spec": "simple_quant", "constvals": undefined},
    {"spec": "simple_quant2", "constvals": undefined},
    {"spec": "simple_setfilter", "constvals": undefined},
    {"spec": "simple_set_of_fns", "constvals": undefined},
    {"spec": "simple_disjunction_constant", "constvals": undefined},
    {"spec": "simple_conjunction_constant", "constvals": undefined},
    {"spec": "simple_disjunction_init", "constvals": undefined},
    {"spec": "simple_unchanged", "constvals": undefined},
    {"spec": "simple_quant_multi", "constvals": undefined},
    {"spec": "simple_multiline", "constvals": undefined},
    {"spec": "set_dot_notation", "constvals": undefined},
    {"spec": "record_literal_eval", "constvals": undefined},
    {"spec": "seq_append", "constvals": undefined},
    {"spec": "primed_tuple", "constvals": undefined},
    {"spec": "mldr_init_only", "constvals": undefined},
    {"spec": "tla_expr_eval", "constvals": undefined},
    {"spec": "EWD998_regression1", "constvals": undefined},
    {"spec": "AsyncTerminationDetection_init", "constvals": undefined},
    // {"spec": "AsyncTerminationDetection", "constvals": undefined},
    {"spec": "pre_module_comments", "constvals": undefined},
    {"spec": "lockserver_nodefs", "constvals": undefined},
    {"spec": "lockserver_nodefs1", "constvals": undefined},
    // {"spec": "DieHard", "constvals": undefined},
    {
        "spec": "lockserver_constant_comment", 
        "constvals": {
            "Server": new SetValue([new StringValue("s1"), new StringValue("s2")]), 
            "Client": new SetValue([new StringValue("c1"), new StringValue("c2")])
        }
    }
    // {
    //     "spec": "DieHarder", 
    //     "constvals": {
    //         "Jug": new SetValue([new StringValue("j1"), new StringValue("j2")]), 
    //         // TODO: Set this to correct function value.
    //         "Capacity": new SetValue([new StringValue("c1"), new StringValue("c2")])
    //     }        
    // }
]

const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());
const arg = params["test"];

// Allow URL arg to choose which test to run.
let testsToRun;
if(arg==="all" || arg === undefined){
    testsToRun = tests;
} else{
    testsToRun = tests.filter(t => t["spec"] === arg);
}

function fetchTestSpec(test){
    let specStatesPath = `./specs/with_state_graphs/${test["spec"]}.tla.dot.json`;
    return $.get(specStatesPath).then(data => {
        let specPath = `./specs/with_state_graphs/${test["spec"]}.tla`;
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
        console.log(`Running test '${test["spec"]}'`);
        testStateGraphEquiv(test["spec"], specStateGraph, specText, test["constvals"]);
    }

    // Measure test duration.
    const duration = (performance.now() - start).toFixed(1);
    console.log(`All tests ran in ${duration}ms`);
    let durationDiv = document.getElementById("test-duration");
    durationDiv.style="margin-top:25px;";
    durationDiv.innerText = `All ${testsToRun.length} tests ran in ${duration}ms`;
});

})();