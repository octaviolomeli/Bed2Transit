var minutes_to_prepare;
var inputted_email;

// Wait for everything to be loaded
document.addEventListener("DOMContentLoaded", () => {
    inputted_email = document.getElementById("nemail").innerText;
    minutes_to_prepare = document.getElementById("minutes_ready");
    minutes_to_prepare = minutes_to_prepare.options[minutes_to_prepare.selectedIndex].value;

    // change value of minutes_to_prepare if the dropdown menu value is changed
    document.getElementById("minutes_ready").addEventListener("change", () => {
        minutes_to_prepare = document.getElementById("minutes_ready");
        minutes_to_prepare = minutes_to_prepare.options[minutes_to_prepare.selectedIndex].value;
    });

    // Insert bus lines into the dropdown menu
    populate_buslines(); 
    populate_bartstations();

    // when bus selected changes, change the other dropdowns
    document.getElementById("bus_lines").addEventListener("change", selectBus);
    document.getElementById("bus_directions").addEventListener("change", selectDirection);
    // when bart station selected changes, change the other dropdowns
    document.getElementById("bart_stops").addEventListener("change", selectStation);
});

// BUS FUNCTIONS

// Populate the bus lines dropdown menu
function populate_buslines() {
    var bus_lines_menu = document.getElementById("bus_lines");
    var html_to_add = "<option value='Select'>Select</option>";

    fetch('../json/busdata.json')
    .then(response => {
        return response.json();
    })
    .then(jsondata => {
        Object.keys(jsondata).forEach(key => {
            html_to_add += '<option value="' + key + '">'+ key + '</option>';
            });
            bus_lines_menu.innerHTML = html_to_add;
    });
}

// Change the other drop downs based on bus selected
function selectBus(){
    var line = document.getElementById("bus_lines");
    line = line.options[line.selectedIndex].value;
    // edge case
    if (line == "Select") {
        document.getElementById("bus_directions").innerHTML = '<option value="Select">Select a line</option>';
        document.getElementById("bus_stops").innerHTML = '<option value="Select">Select a line</option>';
    }
    else {
        fetch('../json/busdata.json')
        .then(response => {
            return response.json();
        })
        .then(jsondata => {
            var direction_menu = document.getElementById("bus_directions");
            var html_to_add =  `<option value="Select" selected>Select</option>
                                <option value="${jsondata[line][0][0]}">${jsondata[line][0][0]}</option>
                                <option value="${jsondata[line][0][1]}">${jsondata[line][0][1]}</option>`;
            direction_menu.innerHTML = html_to_add;
            document.getElementById("bus_stops").innerHTML = '<option value="Select">Select a direction</option>';
        });
    }
}

// Change the bus stops drop down based on direction selected
function selectDirection() {
    var line = document.getElementById("bus_lines");
    line = line.options[line.selectedIndex].value;
    var direction = document.getElementById("bus_directions");
    direction = direction.options[direction.selectedIndex].value;
    // edge case
    if (direction == "Select") {
        document.getElementById("bus_stops").innerHTML = '<option value="Select">Select a line</option>';
    }
    else {
        fetch('../json/busdata.json')
        .then(response => {
            return response.json();
        })
        .then(jsondata => {
            var stop_menu = document.getElementById("bus_stops");
            var html_to_add = "";
    
            for (var i=1;i<jsondata[line].length;i++){
                if (jsondata[line][i]['Direction'] == direction){
                    html_to_add += `<option value="${jsondata[line][i]['Stop']}|${jsondata[line][i]['StopId']}">${jsondata[line][i]['Stop']}</option>`;
                }
            }
            stop_menu.innerHTML = html_to_add;
        });
    }
}

// BART FUNCTIONS

// populate the bart stations dropdown menu
function populate_bartstations() {
    var bart_stations_menu = document.getElementById("bart_stops");
    var html_to_add = "<option value='Select'>Select</option>";

    fetch('../json/bartdata.json')
    .then(response => {
        return response.json();
    })
    .then(jsondata => {
        Object.keys(jsondata).forEach(key => {
            html_to_add += '<option value="' + key + '">'+ jsondata[key]['Name'] + '</option>';
            });
            bart_stations_menu.innerHTML = html_to_add;
    });
}

// Change the other drop downs based on station selected
function selectStation(){
    var station = document.getElementById("bart_stops");
    station = station.options[station.selectedIndex].value;
    // edge case
    if (station == "Select") {
        document.getElementById("bart_directions").innerHTML = '<option value="Select">Select a line</option>';
    }
    else {
        fetch('../json/bartdata.json')
        .then(response => {
            return response.json();
        })
        .then(jsondata => {
            var direction_menu = document.getElementById("bart_directions");
            var html_to_add = '<option value="Select" selected>Select</option>';
            if (jsondata[station]['north_routes'].length != 0) {
                html_to_add += '<option value="north_routes">North</option>';
            }
            if (jsondata[station]['south_routes'].length != 0) {
                html_to_add += '<option value="south_routes">South</option>';
            }
            direction_menu.innerHTML = html_to_add;
        });
    }
}

// PREDICT FUNCTIONS
async function bus_predict(stopId){
    let url = "http://api.511.org/transit/StopMonitoring?api_key=78f2c480-e0ec-430a-b572-7521e6b42448&agency=AC&stopcode="+stopId+"&format=JSON";
    const response = await fetch(url);
    return await response.json();
}

async function BART_predict(station, direction){
    let url = `http://api.bart.gov/api/etd.aspx?cmd=etd&orig=${station}&key=MW9S-E7SL-26DU-VV8V&dir=${direction.substring(0,1)}&json=y`;
    const response = await fetch(url);
    return await response.json();
}

// OTHER FUNCTIONS

// takes in a list of arrival times and returns HTML string
function isItPossible(arrival_times, walk_time){
    if (arrival_times[0] == "N/A") {
        return "N/A<br>";
    }
    var result = "";
    var mins_prepare = minutes_to_prepare;
    if (document.getElementById("prepared").checked) {
        mins_prepare = 0;
    }
    // Loop through each arrival time
    for (var i=0; i<arrival_times.length;i++)
    {
        if ((arrival_times[i] - walk_time - mins_prepare) >= 0)
        {
            result += `Yes. Extra ${arrival_times[i] - walk_time - mins_prepare}<br>`;
        }
        else if ((arrival_times[i] - walk_time*.75 - mins_prepare) >= 0)
        {
            result += "Yes. Walk +25%<br>";
        }
        else if ((arrival_times[i] - walk_time - mins_prepare*.75) >= 0)
        {
            result += "Yes. Ready +25%<br>";
        }
        else if (((arrival_times[i] - walk_time*.75 - mins_prepare) < 0) && ((arrival_times[i] - walk_time - mins_prepare*.75) < 0))
        {
            result += "No time<br>";
        }
    }
    return result.substring(0, result.length - 4); // to remove the last unneccessary <br>
}

// recalculates the arrival time and possible columns for a row
function refresh_entry(row_id){
    var row = document.getElementById(row_id);
    var key_id = row.children[0].textContent;

    // update row html based off type
    if (row.children[1].textContent == "bus"){
        bus_predict(key_id)
        .then(jsondata => {
            const res = bus_arrivals(jsondata, row.children[2].textContent);
            const html_arrivals = res[1];
            const arrival_times = res[0];

            var possible = isItPossible(arrival_times, row.children[7].children[0].options[row.children[7].children[0].selectedIndex].value);
            row.children[6].innerHTML = possible;
            row.children[5].innerHTML = html_arrivals;
            // update database entry column
            update_entry(key_id, 
                row.children[1].textContent, 
                row.children[2].textContent, 
                row.children[3].textContent, 
                row.children[4].textContent,
                html_arrivals,
                possible,
                row.children[7].innerHTML,
                row_id,
                false);
        });
    }
    else {
        BART_predict(key_id, row.children[3].textContent.substring(0, 1))
        .then(jsondata => {
            const res = bart_arrivals(jsondata);
            const html_lines = res[1]
            const html_arrivals = res[0];

            row.children[2].innerHTML = html_lines;
            row.children[5].innerHTML = html_arrivals;
            // update database entry column
            update_entry(key_id,
                row.children[1].textContent,
                html_lines,
                row.children[3].textContent,
                row.children[4].textContent,
                html_arrivals,
                "N/A with BART",
                "N/A with BART",
                row_id,
                false);
        });
    }
}

// Delete a row from the monitor table
function delete_entry(row_id){
    const row = document.getElementById(row_id);
    // loop through the row's children, <td>, and set the text as " ", -1 because don't wanna remove the 'Actions' column
    for (var k=0;k<row.children.length - 1;k++){
        row.children[k].textContent = "";
    }
    // go to database and update the entry column
    var xhr = new XMLHttpRequest();
        xhr.open("POST", "/update_user", true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({
            entry_name: row_id,
            user_email: inputted_email,
            new_value: " | | | | | | | "
    }));
}

// Add new information to a row in the monitor
function add(type)
{
    // get entry selected
    var entry_selected = document.getElementById(type+"_row");
    entry_selected = entry_selected.options[entry_selected.selectedIndex].value;

    // Get the direction 
    var direction = document.getElementById(type+"_directions");
    direction = direction.options[direction.selectedIndex].value;

    // Get the stop
    var stop = document.getElementById(type+"_stops");
    var both = stop.options[stop.selectedIndex].value;
    stop = both.split("|")[0];
    var stopId = both.split("|")[1];
    
    // make sure user did not select the Select option
    if (((stop != "Select") && (direction != "Select") ) &&  minutes != "Select")
    {
        // Different actions if Bus or BART data
        if (type == 'bus')
        {
            var line = document.getElementById("bus_lines");
            line = line.options[line.selectedIndex].value;
            var minutes = document.getElementById(type+"_walk");
            minutes = minutes.options[minutes.selectedIndex].value;

            bus_predict(stopId)
            .then(jsondata => {
                const res = bus_arrivals(jsondata, line);
                const html_arrivals = res[1];
                const arrival_times = res[0];

                // the option that equals the time it takes for users to walk will be "selected"
                var min_walk_html = "<select>";
                for (var i=1; i<=20; i++) {
                    if (i == minutes){
                        min_walk_html = min_walk_html+'<option value="'+i+'" selected>'+i+'</option>';
                    }
                    else {
                        min_walk_html = min_walk_html+'<option value="'+i+'">'+i+'</option>';
                    }
                }
                min_walk_html += "</select>";
                update_entry(stopId, type, line, direction, stop, html_arrivals, isItPossible(arrival_times, minutes), min_walk_html, entry_selected, true);
            });
        }
        else {
            BART_predict(stop, direction)
            .then(jsondata => {
                stop = document.getElementById("bart_stops");
                stop = stop.options[stop.selectedIndex].text;

                station_id = document.getElementById("bart_stops");
                station_id = station_id.options[station_id.selectedIndex].value;

                const res = bart_arrivals(jsondata);
                const html_arrivals = res[0];
                const html_lines = res[1];
                update_entry(station_id, type, html_lines, direction.split("_")[0], stop, html_arrivals, "N/A with BART", "N/A with BART", entry_selected, true);
            });
        }
    }
}

// helper function for add()
// updates the row html and updates the entry column in the database
function update_entry(id, type, line, direction, stop_station, arrival, possible, min_walk, entry_selected, change){
    if (change) {
        const row = document.getElementById(entry_selected);
        // assign values to each column in row
        row.children[0].textContent = id;
        row.children[1].textContent = type;
        row.children[2].innerHTML = line; // innerHTML because <br> might be present
        row.children[3].textContent = direction;
        row.children[4].textContent = stop_station;
        row.children[5].innerHTML = arrival; // innerHTML because <br> might be present
        row.children[6].innerHTML = possible; // innerHTML because <br> might be present
        row.children[7].innerHTML = min_walk // innerHTML because may contain <select><option>
    }

    // variable to store text data in the format that the database holds
    const text_for_database = `${id}|${type}|${line}|${direction}|${stop_station}|${arrival}|${possible}|${min_walk}`;
    var xhr = new XMLHttpRequest();
        xhr.open("POST", "/update_user", true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({
            entry_name: entry_selected,
            user_email: inputted_email,
            new_value: text_for_database
    }));
}

// return arrival times and arrival times in HTML form. This function is for bus types
function bus_arrivals(jsondata, line){
    var arrival_times = ["N/A"];
    var reduced = jsondata['ServiceDelivery']['StopMonitoringDelivery']['MonitoredStopVisit'];
    var timeNow = Date.parse(jsondata['ServiceDelivery']['ResponseTimestamp']);
    // If reduced.length == 0 then there are no predictions
    if (reduced.length != 0){
        // loop through the predictions for the stop and only save the info for predictions regarding the bus the user selected
        for (var hi=0;hi<reduced.length;hi++)
        {
            if (reduced[hi]['MonitoredVehicleJourney']['LineRef'] == line && reduced[hi]['MonitoredVehicleJourney']['MonitoredCall']['ExpectedArrivalTime'] !== null){
                arrival_times.push(Math.floor(((Date.parse(reduced[hi]['MonitoredVehicleJourney']['MonitoredCall']['ExpectedArrivalTime']) - timeNow) / 60000)));
                const index = arrival_times.indexOf("N/A");
                if (index > -1) {
                    arrival_times.splice(index, 1); 
                }
            }    
        }
    }
    // convert arrival_times into html to insert into monitor
    var html_arrivals = "";
    if (arrival_times[0] != "N/A"){
        for (var wee=0;wee<arrival_times.length;wee++){
            html_arrivals += arrival_times[wee] + " minutes<br>";
        }
        html_arrivals = html_arrivals.substring(0, html_arrivals.length - 4);
    }
    else { 
        html_arrivals = arrival_times[0];
    }
    return [arrival_times, html_arrivals];
}

// return trains(line column) in HTML and arrival times HTML. This function is for BART types
function bart_arrivals(jsondata) {
    var arrival_times = ["N/A"];
    var lines_json = jsondata['root']['station'][0]['etd']; // shows multiple lines
    var lines = [];
    // if length = 0, then no predictions
    if (lines_json.length != 0){
        arrival_times.splice(arrival_times.indexOf("N/A"), 1); 
        for (var i=0;i<lines_json.length;i++) // loop through lines at this station
        {
            lines.push(lines_json[i]['destination']);
            arrival_times.push([]);
            for (var j=0;j<lines_json[i]['estimate'].length;j++){ // loop through the predictions for each line
                arrival_times[i].push(lines_json[i]['estimate'][j]['minutes']);  
            }
        }
    }

    // convert arrival_times into html to insert into monitor
    var html_arrivals = "";
    var html_lines = "";
    // if length = 0 then no arrival times
    if (arrival_times.length != 0){
        // loop through lines
        for (var l=0; l<lines.length;l++){
            html_lines += lines[l] + "<br>";
            // loop through prediction for each line
            for (var p=0; p<arrival_times[l].length;p++)
            {
                html_arrivals += arrival_times[l][p] + ", ";
            }
            html_arrivals = html_arrivals.substring(0, html_arrivals.length - 2) + "<br>"; // remove last ", "
        }
        html_arrivals = html_arrivals.substring(0, html_arrivals.length - 4); // remove last "<br>"
        html_lines = html_lines.substring(0, html_lines.length - 4); // remove last "<br>"
    }
    else {
        html_arrivals = "N/A";
        html_lines = "N/A";
    }
    return [html_arrivals, html_lines];
}