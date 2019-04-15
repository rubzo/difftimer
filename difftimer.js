//
// tstate: Timer State
//
let tstates = {
  at_intro: 1,
  select_delta: 2,
  select_max: 3,
  waiting_for_first_move: 4,
  player1_active: 5,
  player2_active: 6,
  times_up: 7,
  paused: 8
};

//
// dstate: Differential State
//
let dstates = {
  not_ready: 1,
  players_equal: 2,
  player1_behind: 3,
  player1_very_behind: 4,
  player2_behind: 5,
  player2_very_behind: 6,
  player1_lost: 7,
  player2_lost: 8,
  players_drew: 9
};

//
// Telemetry object
//

Telemetry = function() {
    var s = {
        tmurl : "https://www.doubleoverride.net",
        tmapi : "/dttm/game/",
        tmobj : null,
    };

    var evnt = {
        START     : "START",
        PAUSE     : "PAUSE",
        RESUME    : "RESUME",
        END       : "END",
        PEQUAL    : "PEQUAL",
        P1BEHIND  : "P1BEHIND",
        P1VBEHIND : "P1VBEHIND",
        P2BEHIND  : "P2BEHIND",
        P2VBEHIND : "P2VBEHIND",
        P1LOST    : "P1LOST",
        P2LOST    : "P2LOST",
        DRAW      : "DRAW",
        P1TOP2    : "P1TOP2",
        P2TOP1    : "P2TOP1",
    };

    var me = {};

    function create_new_game(diff_limit, max_limit) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', s.tmurl + s.tmapi, false);
        xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        var data = {
            "difflimit": diff_limit,
            "maxlimit": max_limit,
        };
        xhr.send(JSON.stringify(data));
        if (xhr.status === 200) {
            s.tmobj = JSON.parse(xhr.responseText);
            return true;
        } else {
            console.log("Error: " + xhr.status);
            console.log(xhr);
            s.tmobj = null;
            return false;
        }
      } catch (err) {
        console.log(err);
      }
      return false;
    }

    me.init = function(diff_limit, max_limit) {
        if (!create_new_game(diff_limit, max_limit)) {
            console.log("Telemetry: Failed to create a new game object!");
        }
    };

    function log_event(evt) {
      if (!s.tmobj) {
        return false;
      }
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', s.tmobj.event, evt != evnt.END);
        xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        var data = {
            "event": evt,
        };
        xhr.onreadystatechange = function() {
            if (this.readyState == 4 ) {
                if (this.status != 200) {
                    console.log("Error: " + this.status);
                    console.log(this);
                    s.tmobj = null;
                }
            }
        };
        xhr.send(JSON.stringify(data));
        return true;
      } catch (err) {
        console.log(err);
      }
      return false;
    };

    me.start = function() {
        log_event(evnt.START);
    };

    me.end = function() {
        log_event(evnt.END);
        s.tmobj = null;
    };

    me.pause = function() {
        log_event(evnt.PAUSE);
    };

    me.resume = function() {
        log_event(evnt.RESUME);
    };

    me.equal = function() {
        log_event(evnt.PEQUAL);
    };

    me.p1_behind = function() {
        log_event(evnt.P1BEHIND);
    };

    me.p1_very_behind = function() {
        log_event(evnt.P1VBEHIND);
    };

    me.p2_behind = function() {
        log_event(evnt.P2BEHIND);
    };

    me.p2_very_behind = function() {
        log_event(evnt.P2VBEHIND);
    };

    me.p1_lost = function() {
        log_event(evnt.P1LOST);
    };

    me.p2_lost = function() {
        log_event(evnt.P2LOST);
    };

    me.draw = function() {
        log_event(evnt.DRAW);
    };

    me.p1_to_p2 = function() {
        log_event(evnt.P1TOP2);
    };

    me.p2_to_p1 = function() {
        log_event(evnt.P2TOP1);
    };

    return me;
}

//
// Our global state.
//
let tstate = tstates.at_intro;
let dstate = dstates.not_ready;
let prev_tstate = null;
let prev_dstate = null;
let diff_limit_ms = 0;
let max_limit_ms = 0;
let no_max = false;
let player1_time = 0;
let player2_time = 0;
let current_differential = 0;
let last_check_time = null;

// The telemetry handler
let telemetry = Telemetry();

// Handle for timer callback.
let setinterval_handle = null;

// References to divs we need to preload so we can change them dynamically.
let div_ids_to_preload = [
  "intro-screen",
  "menu-select-delta",
  "menu-select-max",
  "timer-view",
  "player1-button",
  "player2-button",
  "player1-warning",
  "player2-warning",
  "diff-timer1",
  "diff-timer2",
  "player1-time",
  "player2-time",
  "restart-button",
  "pause-button",
  "sound-tock",
  "sound-times-up",
  "sound-pause",
  "sound-unpause"
];
let ds = {};

function preload_divs() {
  div_ids_to_preload.forEach(function (n) {
    ds[n] = document.getElementById(n);
  });
}

function set_only_class(element, class_name) {
  element.classList = [];
  element.classList.add(class_name);
}

function hide(element) {
  element.classList.remove("visible");
  element.classList.add("hidden");
}

function reveal(element) {
  element.classList.remove("hidden");
  element.classList.add("visible");
}

function show_players_equal() {
  set_only_class(ds["player1-warning"], "equal-player");
  set_only_class(ds["player2-warning"], "equal-player");
  hide(ds["player1-warning"].children[0]);
  hide(ds["player2-warning"].children[0]);
}

function show_player1_behind() {
  set_only_class(ds["player1-warning"], "behind-player");
  set_only_class(ds["player2-warning"], "ahead-player");
  reveal(ds["player1-warning"].children[0]);
  hide(ds["player2-warning"].children[0]);
}

function show_player2_behind() {
  set_only_class(ds["player1-warning"], "ahead-player");
  set_only_class(ds["player2-warning"], "behind-player");
  hide(ds["player1-warning"].children[0]);
  reveal(ds["player2-warning"].children[0]);
}

function clear_current_player_button_state() {
  if (tstate == tstates.player1_active) {
    ds["player1-button"].classList.remove("active-player");
    ds["player2-button"].classList.remove("waiting-player");
  } else if (tstate == tstates.player2_active) {
    ds["player1-button"].classList.remove("waiting-player");
    ds["player2-button"].classList.remove("active-player");
  }
}

function show_player1_lost() {
  clear_current_player_button_state();
  ds["player1-button"].classList.add("lost-player");
  ds["player2-button"].classList.add("won-player");
}

function show_player2_lost() {
  clear_current_player_button_state();
  ds["player1-button"].classList.add("won-player");
  ds["player2-button"].classList.add("lost-player");
}

function show_players_drew() {
  clear_current_player_button_state();
  ds["player1-button"].classList.add("lost-player");
  ds["player2-button"].classList.add("lost-player");
}

function convert_ms_to_minsec_string(t) {
  let secs = Math.floor(t / 1000);
  let mins = Math.floor(secs / 60);
  secs = secs % 60;
  return (mins < 10 ? "0" : "" ) + mins + ":" + (secs < 10 ? "0" : "" ) + secs;
}

function is_player1_behind() {
  return dstate == dstates.player1_behind || dstate == dstates.player1_lost;
}

function is_player2_behind() {
  return dstate == dstates.player2_behind || dstate == dstates.player2_lost;
}

function update_time_display() {
  ds["player1-time"].innerHTML = convert_ms_to_minsec_string(player1_time);
  ds["player2-time"].innerHTML = convert_ms_to_minsec_string(player2_time);

  let diff_string = convert_ms_to_minsec_string(Math.abs(current_differential)) + " (" +
      convert_ms_to_minsec_string(diff_limit_ms) + ")";
  let diff_sign1 = "";
  let diff_sign2 = "";
  if (is_player1_behind()) {
    diff_sign1 = "+";
    diff_sign2 = "-";
  } else if (is_player2_behind()) {
    diff_sign1 = "-";
    diff_sign2 = "+";
  }
  ds["diff-timer1"].innerHTML = diff_sign1 + diff_string;
  ds["diff-timer2"].innerHTML = diff_sign2 + diff_string;
}

function update_times() {
  let d = new Date();
  let new_check_time = d.getTime();
  if (last_check_time == null) {
    last_check_time = new_check_time;
    return;
  }

  let time_delta = new_check_time - last_check_time;
  last_check_time = new_check_time;

  // Update time accounted for
  if (tstate == tstates.player1_active) {
    player1_time += time_delta;
  } else if (tstate == tstates.player2_active) {
    player2_time += time_delta;
  }

  // Check for a draw
  if (!no_max && (player1_time + player2_time) > max_limit_ms) {
    update_time_display();
    // Unfortunately currently these states must be changed in this order
    change_dstate(dstates.players_drew);
    change_tstate(tstates.times_up);
    return;
  }

  current_differential = player1_time - player2_time;

  if (current_differential < -500) {
    if (Math.abs(current_differential) > diff_limit_ms) {
      change_dstate(dstates.player2_lost);
      change_tstate(tstates.times_up);
    } else if (dstate != dstates.player2_behind) {
      change_dstate(dstates.player2_behind);
    }
  } else if (current_differential > 500) {
    if (Math.abs(current_differential) > diff_limit_ms) {
      change_dstate(dstates.player1_lost);
      change_tstate(tstates.times_up);
    } else if (dstate != dstates.player1_behind) {
      change_dstate(dstates.player1_behind);
    }
  } else {
    change_dstate(dstates.players_equal);
  }

  update_time_display();
}

function pause() {
  update_times();
  clearInterval(setinterval_handle);
}

function unpause() {
  setinterval_handle = setInterval(update_times, 200);
  let d = new Date();
  last_check_time = d.getTime();
}

//
// State changers.
//
function change_tstate(target_state) {
  if (target_state == tstates.paused) {
    pause();
    telemetry.pause();
    ds["sound-pause"].play();
  } else if (tstate == tstates.paused) {
    unpause();
    telemetry.resume();
    ds["sound-unpause"].play();
  } else if (target_state == tstates.select_delta) {
    hide(ds["intro-screen"]);
    reveal(ds["menu-select-delta"]);
  } else if (target_state == tstates.select_max) {
    hide(ds["menu-select-delta"]);
    reveal(ds["menu-select-max"]);
  } else if (target_state == tstates.waiting_for_first_move) {
    if (no_max) {
        telemetry.init(diff_limit_ms/1000, 0);
    } else {
        telemetry.init(diff_limit_ms/1000, max_limit_ms/1000);
    }
    hide(ds["intro-screen"]);
    hide(ds["menu-select-delta"]);
    hide(ds["menu-select-max"]);
    reveal(ds["timer-view"]);
    telemetry.start();
  } else if (target_state == tstates.player1_active) {
    ds["player2-button"].classList.remove("active-player");
    ds["player1-button"].classList.remove("waiting-player");
    ds["player2-button"].classList.add("waiting-player");
    ds["player1-button"].classList.add("active-player");
    ds["sound-tock"].play();
    update_times();
    telemetry.p2_to_p1();
  } else if (target_state == tstates.player2_active) {
    ds["player1-button"].classList.remove("active-player");
    ds["player2-button"].classList.remove("waiting-player");
    ds["player1-button"].classList.add("waiting-player");
    ds["player2-button"].classList.add("active-player");
    ds["sound-tock"].play();
    update_times();
    telemetry.p1_to_p2();
  } else if (target_state == tstates.times_up) {
    clearInterval(setinterval_handle);
    ds["sound-times-up"].play();
  }
  // Check if state _was_ waiting for first move
  // If so, kick off the timer.
  if (tstate == tstates.waiting_for_first_move) {
    setinterval_handle = setInterval(update_times, 200);
  }
  prev_tstate = tstate;
  tstate = target_state;
}

function change_dstate(target_state) {
  if (target_state == dstates.players_equal) {
    show_players_equal();
    if (target_state != dstate) {
      telemetry.equal();
    }
  } else if (target_state == dstates.player1_behind) {
    show_player1_behind();
    if (target_state != dstate) {
      telemetry.p1_behind();
    }
  } else if (target_state == dstates.player2_behind) {
    show_player2_behind();
    if (target_state != dstate) {
      telemetry.p2_behind();
    }
  } else if (target_state == dstates.player1_lost) {
    if (target_state != dstate) {
      telemetry.p1_lost();
    }
    show_player1_lost();
    telemetry.end();
  } else if (target_state == dstates.player2_lost) {
    if (target_state != dstate) {
      telemetry.p2_lost();
    }
    show_player2_lost();
    telemetry.end();
  } else if (target_state == dstates.players_drew) {
    if (target_state != dstate) {
      telemetry.draw();
    }
    show_players_drew();
    telemetry.end();
  }
  prev_dstate = dstate;
  dstate = target_state;
}

//
// Button listeners.
//
function intro_button_listener(e) {
  let id_string = e.currentTarget.id;
  if (id_string == "intro-select-custom") {
    change_tstate(tstates.select_delta);
  } else if (id_string == "intro-select-tournament") {
    diff_limit_ms = 120 * 1000;
    no_max = true;
    change_tstate(tstates.waiting_for_first_move);
    change_dstate(dstates.players_equal);
  }
};

function delta_button_listener(e) {
  let id_string = e.currentTarget.id;
  let delta_secs = id_string.slice(11);
  diff_limit_ms = parseInt(delta_secs) * 1000;
  change_tstate(tstates.select_max);
};

function max_button_listener(e) {
  let id_string = e.currentTarget.id;
  if (id_string == "max-mins-unlimited") {
    no_max = true;
  } else {
    let max_mins = id_string.slice(9);
    max_limit_ms = parseInt(max_mins) * 60000;
  }
  change_tstate(tstates.waiting_for_first_move);
  change_dstate(dstates.players_equal);
};

function player_button_listener(player_id) {
  if (player_id == 1 &&
             (tstate == tstates.player1_active ||
              tstate == tstates.waiting_for_first_move)) {
    change_tstate(tstates.player2_active);
  } else if (player_id == 2 &&
             (tstate == tstates.player2_active ||
              tstate == tstates.waiting_for_first_move)) {
    change_tstate(tstates.player1_active);
  }
};

function player1_button_listener(e) {
  player_button_listener(1);
};

function player2_button_listener(e) {
  player_button_listener(2);
}

function restart_button_listener(e) {
  telemetry.end();
  location.reload();
}

function pause_button_listener(e) {
  if (tstate == tstates.player1_active || tstate == tstates.player2_active) {
    change_tstate(tstates.paused);
  } else if (tstate == tstates.paused) {
    change_tstate(prev_tstate);
  }
}

//
// Setup functions.
//
function add_listeners_to_child_buttons(div, listener) {
  let container = div.getElementsByClassName("button-container")[0];
  for (let i = 0; i < container.children.length; i++) {
    container.children[i].addEventListener("click", listener);
  };
}

function initial_setup() {
  preload_divs();
  add_listeners_to_child_buttons(ds["intro-screen"], intro_button_listener);
  add_listeners_to_child_buttons(ds["menu-select-delta"], delta_button_listener);
  add_listeners_to_child_buttons(ds["menu-select-max"], max_button_listener);
  ds["player1-button"].addEventListener("click", player1_button_listener);
  ds["player2-button"].addEventListener("click", player2_button_listener);
  ds["restart-button"].addEventListener("click", restart_button_listener);
  ds["pause-button"].addEventListener("click", pause_button_listener);
  ds["sound-tock"].load();
  ds["sound-times-up"].load();
  ds["sound-pause"].load();
  ds["sound-unpause"].load();
};

window.onload = initial_setup;
