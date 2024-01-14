/* Constants */

const ICAL_HEADER = "BEGIN:VCALENDAR\nVERSION:2.0";
const ICAL_FOOTER = "END:VCALENDAR";
const ICAL_EVENT_HEADER = "BEGIN:VEVENT";
const ICAL_EVENT_FOOTER = "END:VEVENT";
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_ABBREVIATIONS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]

/* Helpers */

// Similar to apl's partition (⊆)
// true signifies a new partition should be started
// elements to the left of the first true are discarded
// ([bool], [any]) -> [[any]]
function partition(bools, elems) {
    if(bools.length != elems.length) console.error("partition: mismatched array lengths");

    let first_true_idx = bools.indexOf(true);
    if(first_true_idx == -1) return [];

    let acc = [elems[first_true_idx]];
    let res = [];

    for(let i = first_true_idx + 1; i < bools.length; i++) {
        if(bools[i]) {
            res.push(acc);
            acc = [];
        }

        acc.push(elems[i]);
    }

    if(acc.length) res.push(acc);

    return res;
}

// convert 12-hour (hh, mm, am/pm) time to 24-hour HHMM00 string
function to_std_time(h, m, i) { // (string, string, string) -> string
    h = String(Number(h) % 12 + (12 * (i == "PM")));
    if(h.length == 1) h = "0" + h;

    return h + m + "00";
}

// evaluates the given string as if it were in a template literal
// with access to the given object, if supplied
function run_string_as_template(s, obj = {}) {
    with (obj) {
        return eval("`" + s + "`");
    }
}

// converts "yyyy-mm-dd" to a date
// string -> date
function str_to_date(s) {
    let [, y, m, d] = s.match(/(\d\d\d\d)-(\d\d)-(\d\d)/)
    return new Date(Number(y), Number(m) - 1, Number(d));
}

// convert a date to "yyyy-mm-dd"
// date -> string
function date_to_str(d) {
    let year = String(d.getFullYear());
    let month = String(d.getMonth() + 1).padStart(2, "0");
    let date = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${date}`;
}

// advances the given date to the next match of the given day-of-week
// (date, int) -> date
function next_n_day(date, day) {
    date = new Date(date); // copy
    let diff = (day - date.getDay() + 7) % 7
    date.setDate(date.getDate() + diff);
    return date;
}

/* "Parsing" */

function split_by_day(s) { // string -> [{day: number, text: string}]
    let lines = s.split("\n");

    return partition(lines.map(line => DAY_NAMES.includes(line)), lines)
               .map(group => ({day: DAY_NAMES.indexOf(group[0]), text: group.slice(1).join("\n")}));
}

// (number, string) -> event-info-object
function classify_event_str(day, s) {
    s = s.trim();
    let fields = s.split("\n");

    if(fields.length != 4) console.error("invalid event (expected 4 lines):", s);

    let [name, type, loc, time] = fields;

    let [, course_subject, course_number, course_title] = name.match(/^(\D+) (\d+): (.*)$/);
    let [, event_type, event_number] = type.match(/^(\D+) (\d+$)/);
    let [, hstart, mstart, istart, hend, mend, iend] = time.match(/^(\d+):(\d+) ([AP]M) to (\d+):(\d+) ([AP]M$)/);
    let start_time = to_std_time(hstart, mstart, istart);
    let end_time = to_std_time(hend, mend, iend);

    return {
        day: day,
        location: loc,
        subject: course_subject,
        number: course_number,
        course_title: course_title,
        event_type: event_type,
        event_number: event_number,
        start_time: start_time,
        end_time: end_time,
    };
}

// (options-object, event-info-object) -> string
function event_to_ical(options, event) {
    let location_field = "";
    if(options.include_location) location_field = "LOCATION: " + event.location + "\n";

    let date = date_to_str(next_n_day(str_to_date(options.term_start), event.day)).replace(/-/g, "");

    return ICAL_EVENT_HEADER + "\n" +
        "SUMMARY:" + run_string_as_template(options.summary_pat, event) + "\n" +
        "DESCRIPTION:" + run_string_as_template(options.description_pat, event) + "\n" +
        "DTSTART;TZID=America/Chicago:" + date + "T" + event.start_time + "\n" +
        "DTEND;TZID=America/Chicago:" + date + "T" + event.end_time + "\n" +
        "RRULE:FREQ=WEEKLY;BYDAY=" + DAY_ABBREVIATIONS[event.day] + ";UNTIL=" + options.term_end.replace(/-/g, "") + "T235959\n" +
        location_field + 
        ICAL_EVENT_FOOTER;
}

function convert(options, raw_input) {
    let ical_events = split_by_day(raw_input)
        .map(day => day.text.split("\n\n").map(event_str => classify_event_str(day.day, event_str)))
        .flat()
        .map(event_obj => event_to_ical(options, event_obj))
        .join("\n")
    
    return ICAL_HEADER + "\n" + ical_events + "\n" + ICAL_FOOTER;
}