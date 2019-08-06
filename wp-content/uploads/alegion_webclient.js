// var auth_resp;
var alegion_baseurl = "https://app.alegion.com/api/v1";
var workspaces, batches;

$(document).ready(function() {
    $("#btn_auth").click(function() {
        var username = $("#txt_uname")
            .val()
            .trim();
        var password = $("#txt_pwd")
            .val()
            .trim();

        if (username != "" && password != "") {
            authenticate(username, password, "#auth_message");
        }
    });
    $("#btn_wksp").click(function() {
        // $("#wksp_message").html("Choose");
        getWorkspaces();
    });
    $("#wkspOptions").change(function() {
        var selected = document.getElementById("wkspOptions").value;
        $("#wksp_message").html(
            "Selected: <pre>" + JSON.stringify(workspaces[selected], null, 2) + "</pre>"
        );
        $("#txt_wkspId").val(workspaces[selected].id);
        $("#txt_wkspName").val(workspaces[selected].name);
    });
    $("#btn_batches").click(function() {
        // $("#batches_message").html(auth_resp.access_token.substring(0, 50));
        getBatches();
    });
    $("#batchOptions").change(function() {
        var selected = document.getElementById("batchOptions").value;
        $("#batches_message").html(
            "Selected: <pre>" + JSON.stringify(batches[selected], null, 2) + "</pre>"
        );
        $("#txt_batchId").val(batches[selected].id);
        $("#txt_batchName").val(batches[selected].name);
    });

    $("#btn_records").click(function() {
        // $("#batches_message").html(auth_resp.access_token.substring(0, 50));
        getRecords();
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
            var msg = "";

            if (response == 1) {
                //window.location="home.php";
            } else {
                msg = "Invalid username and password!";
            }

            // auth_resp = response;
            //$("#auth_message").html(auth_resp.access_token);
            $("#txt_authToken").val(response.access_token);
        },
        error: function(xhr, textStatus, errorThrown) {
            $(messageComp).html(
                textStatus + "<br/>" + JSON.stringify(errorThrown)
            );
            console.error("Error", errorThrown);
            $("#auth_message").html(errorThrown);
        }
    });
}

function submitGet(urlpath, successFunc, messageComp) {
    var access_token = $("#txt_authToken").val();
    if (access_token.length > 0)
        $.ajax({
            type: "GET",
            // xhrFields: {
            //     withCredentials: true
            // },
            cache: false,
            dataType: "json",
            headers: {
                Authorization: "Bearer " + access_token
            },
            // beforeSend: function(xhr) {
            //     xhr.setRequestHeader("Authorization", "Bearer " + access_token);
            // },

            url: alegion_baseurl + urlpath,
            success: function(response, textStatus) {
                var msgSuffix="";
                if(Array.isArray(response))
                    msgSuffix=", response count="+response.length;
                $(messageComp).html("Success"+msgSuffix);
                console.debug(
                    "Success " + urlpath + ": " + textStatus,
                    response
                );
                successFunc(response);
            },
            error: function(xhr, textStatus, errorThrown) {
                console.error(
                    "Error " + urlpath + ": " + textStatus,
                    xhr.status,
                    errorThrown
                );
            }
        })
        .fail(function(xhr, textStatus, errorThrown) {
            $(messageComp).html(
                textStatus + "<br/>" + JSON.stringify(errorThrown)
            );
            console.error(
                "Fail " + urlpath + ": " + textStatus,
                xhr.statusText,
                errorThrown
            );
        })
        .done(function(data) {
            console.debug("done " + urlpath);
        });
}

function getWorkspaces() {
    submitGet(
        "/workflows",
        function(resp) {
            workspaces = _.keyBy(resp, function(o) {
                return o.id;
            });
            console.debug("workspaces", workspaces);
            $("#wkspOptions").empty();
            $.each(resp, function(i, p) {
                $("#wkspOptions").append(
                    $("<option></option>")
                    .val(p.id)
                    .html(p.name)
                );
            });
        },
        "#wksp_message"
    );
}

function getBatches() {
    var wkspId = $("#txt_wkspId").val();
    if (wkspId.length > 0)
        submitGet(
            "/workflows/" + wkspId + "/batches",
            function(resp) {
                batches = _.keyBy(resp, function(o) {
                    return o.id;
                });
                console.debug("batches", batches);
                $("#batchOptions").empty();
                $.each(resp, function(i, p) {
                    $("#batchOptions").append(
                        $("<option></option>")
                        .val(p.id)
                        .html(p.name + " (isActive=" + p.isActive + ")")
                    );
                });
            },
            "#batches_message"
        );
}

function getRecords() {
    var batchId = $("#txt_batchId").val();
    if (batchId.length > 0)
        submitGet(
            "/batches/" + batchId + "/records",
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
                            "<span class='badge badge-success badge-pill'>" +
                            p.status +
                            "</span></div>" +
                            "<pre>data:" +
                            JSON.stringify(p.data, null, 2) +
                            "</pre>"
                        )
                    );
                });
            },
            "#records_message"
        );
}