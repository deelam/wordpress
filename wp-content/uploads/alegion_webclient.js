// Version: 2019.08.09

var show_instructs = true;
var alegion_baseurl = "https://app.alegion.com/api/v1";
var workflows, batches;

$(document).ready(function() {
    $("#btn_instructs").click(function() {
        if(show_instructs){
            show_instructs=false
            $(".instructs").hide()
        }else{
            show_instructs=true
            $(".instructs").show()
        }
    });

    $("#btn_auth").click(function() {
        var username = $("#txt_uname")
            .val()
            .trim();

        var password = $("#txt_pwd")
            .val()
            .trim();

        if (username.length == 0) {
            $("#auth_message").html("Enter your username");
        } else if (password.length == 0) {
            $("#auth_message").html("Enter your password");
        } else {
            authenticate(username, password, "#auth_message");
        }
    });

    $("#btn_wkflow").click(function() {
        getWorkflows();
    });
    $("#wkflowOptions").hide();
    $("#wkflowOptions").change(function() {
        var selected = document.getElementById("wkflowOptions").value;
        $("#wkflow_message").html(
            "Selected: <pre>" +
                JSON.stringify(workflows[selected], null, 2) +
                "</pre>"
        );
        $("#txt_wkflowId").val(workflows[selected].id);
        $("#txt_wkflowName").val(workflows[selected].name);
    });

    $("#btn_batches").click(function() {
        getBatches();
    });
    $("#batchOptions").hide();
    $("#batchOptions").change(function() {
        var selected = document.getElementById("batchOptions").value;
        $("#batches_message").html(
            "Selected: <pre>" +
                JSON.stringify(batches[selected], null, 2) +
                "</pre>"
        );
        $("#txt_batchId").val(batches[selected].id);
        $("#txt_batchName").val(batches[selected].name);
        $("#txt_batchName2").val(batches[selected].name);
    });

    $("#btn_records").click(function() {
        getRecords();
    });
    $("#btn_results").click(function() {
        getResults();
    });
});

function authenticate(username, password, messageComp) {
    console.log("Authenticating", username);
    $.ajax({
        url: "https://app.alegion.com/api/v1/login",
        type: "POST",
        data: JSON.stringify({
            username: username,
            password: password
        }),

        dataType: "json",
        headers: {
            "Content-Type": "application/json"
        },
        success: function(response) {
            $(messageComp).html("Success");
            console.debug("response", response);
            $("#txt_authToken").val(response.access_token);
        },
        error: function(xhr, textStatus, errorThrown) {
            $(messageComp).html(
                xhr.status +
                    " " +
                    textStatus +
                    "<br/>" +
                    JSON.stringify(xhr.responseJSON)
            );
            console.error("Authentication error", xhr, errorThrown);
        }
    });
}

function submitGet(urlpath, messageComp, successFunc) {
    var access_token = $("#txt_authToken")
        .val()
        .trim();
    if (access_token.length == 0) {
        $(messageComp).html("Authentication required!");
    } else {
        $(messageComp).html("Submitting request to ..." + urlpath);
        $.ajax({
            type: "GET",
            url: alegion_baseurl + urlpath,
            cache: false,
            dataType: "json",
            headers: {
                Authorization: "Bearer " + access_token
            },
            success: function(response, textStatus) {
                var msgSuffix = "";
                if (Array.isArray(response))
                    msgSuffix = ", response count=" + response.length;
                $(messageComp).html("Success" + msgSuffix);
                console.debug(
                    "Success " + urlpath + ": " + textStatus,
                    response
                );
                successFunc(response);
            },
            error: function(xhr, textStatus, errorThrown) {
                $(messageComp).html(
                    xhr.status +
                        " Error! " +
                        textStatus +
                        "<br/>" +
                        JSON.stringify(xhr.responseJSON)
                );
                console.error(
                    "Error " + urlpath + ": " + textStatus,
                    xhr,
                    errorThrown
                );
            }
        });
    }
}

function getWorkflows() {
    submitGet("/workflows", "#wkflow_message", function(resp) {
        workflows = _.keyBy(resp, function(o) {
            return o.id;
        });
        console.debug("workflows", workflows);
        $("#wkflowOptions").empty();
        $("#wkflowOptions").append(
            "<option value='' disabled selected>Select workflow</option>"
        );
        $.each(resp, function(i, p) {
            $("#wkflowOptions").append(
                $("<option></option>")
                    .val(p.id)
                    .html(p.name)
            );
        });
        $("#wkflowOptions").show();
    });
}

function getBatches() {
    var wkflowId = $("#txt_wkflowId")
        .val()
        .trim();
    if (wkflowId.length == 0) {
        $("#batches_message").html("Select a workflow first");
    } else {
        submitGet(
            "/workflows/" + wkflowId + "/batches",
            "#batches_message",
            function(resp) {
                batches = _.keyBy(resp, function(o) {
                    return o.id;
                });
                console.debug("batches", batches);
                $("#batchOptions").empty();
                $("#batchOptions").append(
                    "<option value='' disabled selected>Select batch</option>"
                );
                $.each(resp, function(i, p) {
                    $("#batchOptions").append(
                        $("<option></option>")
                            .val(p.id)
                            .html(p.name + " (isActive=" + p.isActive + ")")
                    );
                });
                $("#batchOptions").show();
            }
        );
    }
}

var recordStatus2Color = {
    "queued": "secondary",
    "in-progress": "warning",
    complete: "success",
    canceled: "dark",
    error: "danger"
};

function getRecords() {
    var batchId = $("#txt_batchId").val();
    if (batchId.length == 0) {
        $("#records_message").html("Select a batch first");
    } else {
        submitGet(
            "/batches/" + batchId + "/records",
            "#records_message",
            function(resp) {
                // records = _.keyBy(resp, function(o) {
                //     return o.id;
                // });
                console.debug("records", resp);
                $("#records_list").empty();
                $.each(resp, function(i, p) {
                    $("#records_list").append(
                        $("<li class='list-group-item'></li>").html(
                            "<div class='d-flex justify-content-between align-items-center'>" +
                                p.id +
                                "<span class='badge badge-info badge-pill'>" +
                                p.createdAt +
                                "</span><span class='badge badge-" +
                                recordStatus2Color[p.status] +
                                " badge-pill'>" +
                                p.status +
                                "</span></div>" +
                                "<pre>data:" +
                                JSON.stringify(p.data, null, 2) +
                                "</pre>"
                        )
                    );
                });
            }
        );
    }
}

function getResults() {
    var batchId = $("#txt_batchId").val();
    if (batchId.length == 0) {
        $("#results_message").html("Select a batch first");
    } else {
        submitGet(
            "/batches/" + batchId + "/results",
            "#results_message",
            function(resp) {
                // results = _.keyBy(resp, function(o) {
                //     return o.id;
                // });
                console.debug("results", resp);
                $("#results_list").empty();
                $.each(resp, function(i, p) {
                    $("#results_list").append(
                        $("<li class='list-group-item'></li>").html(
                            "<div class='d-flex justify-content-between align-items-center'>" +
                                p.id +
                                "<span class='badge badge-info badge-pill'>" +
                                p.createdAt +
                                "</span></div>" +
                                "<pre>inputRecord:" +
                                JSON.stringify(p.inputRecord, null, 2) +
                                "</pre>" +
                                "<pre>resultData:" +
                                JSON.stringify(p.resultData, null, 2) +
                                "</pre>"
                        )
                    );
                });
            }
        );
    }
}