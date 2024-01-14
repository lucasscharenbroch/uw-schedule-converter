/* Constants */

const text_input_elem = document.querySelector("#text-input");
const text_output_elem = document.querySelector("#text-output");
const title_elem = document.querySelector("#title-input");
const description_elem = document.querySelector("#description-input");
const term_start_elem = document.querySelector("#term-start-input");
const term_end_elem = document.querySelector("#term-end-input");
const include_location_elem = document.querySelector("#include-location-input");

/* Misc. Runtime Helpers */

function set_input_elem_default_text() {
    fetch("demo-input.txt")
        .then(response => response.text())
        .then(text => text_input_elem.value = text);
}

function populate_default_fields() {
    title_elem.value = "${subject} ${number} (${event_type} ${event_number})";
    description_elem.value = "${course_title}";
    term_start_elem.value = "2024-01-23";
    term_end_elem.value = "2024-05-03";
    include_location_elem.checked = true;
    text_output_elem.value = "";
    set_input_elem_default_text();
}

function do_conversion() {
    let options = {
                    summary_pat: title_elem.value,
                    description_pat: description_elem.value,
                    term_start: term_start_elem.value,
                    term_end: term_end_elem.value,
                    include_location: include_location_elem.value,
                  };

    text_output_elem.value = convert(options, text_input_elem.value);
}

function download_ical() {
    let blob = new Blob([text_output_elem.value], {type: "text/plain"});
    let link = document.createElement("a");

    link.download = "uw_schedule.ical";
    link.href = window.URL.createObjectURL(blob);
    link.click();

    window.URL.revokeObjectURL(link.href);
}

/* Runtime */
populate_default_fields();