let tstates = {
  select_delta: 1,
  select_max: 2,
  waiting_for_first_move: 3,
  player1_active: 4,
  player2_active: 5,
  times_up: 6
};

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

let tstate = tstates.select_delta;
let dstate = dstates.not_ready;
let diff_limit_ms = 0;
let max_limit_ms = 0;
let no_max = false;
let player1_time = 0;
let player2_time = 0;
let current_differential = 0;
let last_check_time = null;

let setinterval_handle = null;

let div_menu_select_delta = null;
let div_menu_select_max = null;
let div_timer_view = null;
let div_player1_button = null;
let div_player2_button = null;
let div_player1_warning = null
let div_player2_warning = null
let div_diff_timer = null
let div_player1_time = null;
let div_player2_time = null;

function show_players_equal() {
  div_player1_warning.classList = [];
  div_player1_warning.classList.add("equal-player");
  div_player1_warning.children[0].innerHTML = "";
  div_player2_warning.classList = [];
  div_player2_warning.classList.add("equal-player");
  div_player2_warning.children[0].innerHTML = "";
}

function show_player1_behind() {
  div_player1_warning.classList = [];
  div_player1_warning.classList.add("behind-player");
  div_player1_warning.children[0].innerHTML = "▲▲▲▲▲";
  div_player2_warning.classList = [];
  div_player2_warning.classList.add("ahead-player");
  div_player2_warning.children[0].innerHTML = "";
}

function show_player2_behind() {
  div_player1_warning.classList = [];
  div_player1_warning.classList.add("ahead-player");
  div_player1_warning.children[0].innerHTML = "";
  div_player2_warning.classList = [];
  div_player2_warning.classList.add("behind-player");
  div_player2_warning.children[0].innerHTML = "▼▼▼▼▼";
}

function clear_current_player_button_state() {
  if (tstate == tstates.player1_active) {
    div_player1_button.classList.remove("active-player");
    div_player2_button.classList.remove("waiting-player");
  } else if (tstate == tstates.player2_active) {
    div_player1_button.classList.remove("waiting-player");
    div_player2_button.classList.remove("active-player");
  }
}

function show_player1_lost() {
  clear_current_player_button_state();
  div_player1_button.classList.add("lost-player");
  div_player2_button.classList.add("won-player");
}

function show_player2_lost() {
  clear_current_player_button_state();
  div_player1_button.classList.add("won-player");
  div_player2_button.classList.add("lost-player");
}

function show_players_drew() {
  clear_current_player_button_state();
  div_player1_button.classList.add("lost-player");
  div_player2_button.classList.add("lost-player");
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
  div_player1_time.innerHTML = convert_ms_to_minsec_string(player1_time);
  div_player2_time.innerHTML = convert_ms_to_minsec_string(player2_time);
  let diff_string = convert_ms_to_minsec_string(Math.abs(current_differential)) + " (" + convert_ms_to_minsec_string(diff_limit_ms) + ")";
  let diff_sign1 = "";
  if (is_player1_behind()) {
    diff_sign1 = "+";
  } else if (is_player2_behind()) {
    diff_sign1 = "-";
  }
  let diff_sign2 = "";
  if (is_player1_behind()) {
    diff_sign2 = "-";
  } else if (is_player2_behind()) {
    diff_sign2 = "+";
  }
  div_diff_timer1.innerHTML = diff_sign1 + diff_string;
  div_diff_timer2.innerHTML = diff_sign2 + diff_string;
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

function change_tstate(target_state) {
  if (target_state == tstates.select_max) {
    div_menu_select_delta.classList.remove("visible");
    div_menu_select_delta.classList.add("hidden");
    div_menu_select_max.classList.remove("hidden");
    div_menu_select_max.classList.add("visible");
  } else if (target_state == tstates.waiting_for_first_move) {
    div_menu_select_max.classList.remove("visible");
    div_menu_select_max.classList.add("hidden");
    div_timer_view.classList.remove("hidden");
    div_timer_view.classList.add("visible");
  } else if (target_state == tstates.player1_active) {
    div_player2_button.classList.remove("active-player");
    div_player1_button.classList.remove("waiting-player");
    div_player2_button.classList.add("waiting-player");
    div_player1_button.classList.add("active-player");
    // TODO: sound
    update_times();
  } else if (target_state == tstates.player2_active) {
    div_player1_button.classList.remove("active-player");
    div_player2_button.classList.remove("waiting-player");
    div_player1_button.classList.add("waiting-player");
    div_player2_button.classList.add("active-player");
    // TODO: sound
    update_times();
  } else if (target_state == tstates.times_up) {
    clearInterval(setinterval_handle);
    // TODO: sound
  }
  // Check if state _was_ waiting for first move
  // If so, kick off the timer.
  if (tstate == tstates.waiting_for_first_move) {
    setinterval_handle = setInterval(update_times, 200);
  }
  tstate = target_state;
}

function change_dstate(target_state) {
  if (target_state == dstates.players_equal) {
    show_players_equal();
  } else if (target_state == dstates.player1_behind) {
    show_player1_behind();
  } else if (target_state == dstates.player2_behind) {
    show_player2_behind();
  } else if (target_state == dstates.player1_lost) {
    show_player1_lost();
  } else if (target_state == dstates.player2_lost) {
    show_player2_lost();
  } else if (target_state == dstates.players_drew) {
    show_players_drew();
  }
  dstate = target_state;
}

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

function add_listeners_to_child_buttons(div, listener) {
  let container = div.getElementsByClassName("button-container")[0];
  for (let i = 0; i < container.children.length; i++) {
    container.children[i].addEventListener("click", listener);
  };
}

function initial_setup() {
  div_timer_view = document.getElementById("timer-view");

  div_menu_select_delta = document.getElementById("menu-select-delta");
  add_listeners_to_child_buttons(div_menu_select_delta, delta_button_listener);
  div_menu_select_max = document.getElementById("menu-select-max");
  add_listeners_to_child_buttons(div_menu_select_max, max_button_listener);

  div_player1_button = document.getElementById("player1-button");
  div_player1_button.addEventListener("click", player1_button_listener);
  div_player2_button = document.getElementById("player2-button");
  div_player2_button.addEventListener("click", player2_button_listener);
  div_player1_warning = document.getElementById("player1-warning");
  div_player2_warning = document.getElementById("player2-warning");
  div_diff_timer1 = document.getElementById("diff-timer1");
  div_diff_timer2 = document.getElementById("diff-timer2");
  div_player1_time = document.getElementById("player1-time");
  div_player2_time = document.getElementById("player2-time");
};

window.onload = initial_setup;
