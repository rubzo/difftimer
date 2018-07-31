let tstates = {
  not_ready: 1,
  waiting_for_first_move: 2,
  player1_active: 3,
  player2_active: 4,
  times_up: 5
};

let dstates = {
  not_ready: 1,
  players_equal: 2,
  player1_behind: 3,
  player1_very_behind: 4,
  player2_behind: 5,
  player2_very_behind: 6,
  player1_lost: 7,
  player2_lost: 8
};

let tstate = tstates.not_ready;
let dstate = dstates.not_ready;
let diff_limit_ms = 0;
let player1_time = 0;
let player2_time = 0;
let current_differential = 0;
let last_check_time = null;

let setinterval_handle = null;

let intro_view = null;
let timer_view = null;
let div_player1_button = null;
let div_player2_button = null;
let div_player1_warning = null
let div_player2_warning = null
let div_diff_timer = null
let div_player1_time = null;
let div_player2_time = null;
let div_differential = null;

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

function show_player1_lost() {
  if (tstate == tstates.player1_active) {
    div_player1_button.classList.remove("active-player");
    div_player2_button.classList.remove("waiting-player");
  } else if (tstate == tstates.player2_active) {
    div_player1_button.classList.remove("waiting-player");
    div_player2_button.classList.remove("active-player");
  }
  div_player1_button.classList.add("lost-player");
  div_player2_button.classList.add("won-player");
}

function show_player2_lost() {
  if (tstate == tstates.player1_active) {
    div_player1_button.classList.remove("active-player");
    div_player2_button.classList.remove("waiting-player");
  } else if (tstate == tstates.player2_active) {
    div_player1_button.classList.remove("waiting-player");
    div_player2_button.classList.remove("active-player");
  }
  div_player1_button.classList.add("won-player");
  div_player2_button.classList.add("lost-player");
}

function convert_ms_to_minsec_string(t) {
  let secs = Math.floor(t / 1000);
  let mins = Math.floor(secs / 60);
  secs = secs % 60;
  return (mins < 10 ? "0" : "" ) + mins + ":" + (secs < 10 ? "0" : "" ) + secs;
}

function update_time_display() {
  div_player1_time.innerHTML = convert_ms_to_minsec_string(player1_time);
  div_player2_time.innerHTML = convert_ms_to_minsec_string(player2_time);
  div_diff_timer.innerHTML = convert_ms_to_minsec_string(Math.abs(current_differential)) + " (" + convert_ms_to_minsec_string(diff_limit_ms) + ")";
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
  if (target_state == tstates.waiting_for_first_move) {

  } else if (target_state == tstates.player1_active) {
    div_player2_button.classList.remove("active-player");
    div_player1_button.classList.remove("waiting-player");
    div_player2_button.classList.add("waiting-player");
    div_player1_button.classList.add("active-player");
    div_differential.classList.add("upside-down");
    // TODO: sound
    update_times();
  } else if (target_state == tstates.player2_active) {
    div_player1_button.classList.remove("active-player");
    div_player2_button.classList.remove("waiting-player");
    div_player1_button.classList.add("waiting-player");
    div_player2_button.classList.add("active-player");
    div_differential.classList.remove("upside-down");
    // TODO: sound
    update_times();
  } else if (target_state == tstates.times_up) {
    div_differential.classList.remove("differential");
    div_differential.classList.add("differential-game-over");
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
  }
  dstate = target_state;
}

function prepare_timer(limit_s) {
  diff_limit_ms = parseInt(limit_s) * 1000;
  change_tstate(tstates.waiting_for_first_move);
  change_dstate(dstates.players_equal);

  intro_view.style.display = "none";
  timer_view.style.display = "block";
}

function start_button_listener(e) {
  let id_string = e.currentTarget.id;
  let limit_s = id_string.slice(8);
  prepare_timer(limit_s);
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

function initial_setup() {
  intro_view = document.getElementsByClassName("intro-view")[0];
  timer_view = document.getElementsByClassName("timer-view")[0];
  let button_container = intro_view.children[1];
  for (let i = 0; i < button_container.children.length; i++) {
    button_container.children[i].addEventListener("click", start_button_listener);
  };
  div_player1_button = document.getElementById("player1-button");
  div_player1_button.addEventListener("click", player1_button_listener);
  div_player2_button = document.getElementById("player2-button");
  div_player2_button.addEventListener("click", player2_button_listener);
  div_player1_warning = document.getElementById("player1-warning");
  div_player2_warning = document.getElementById("player2-warning");
  div_diff_timer = document.getElementById("diff-timer");
  div_player1_time = document.getElementById("player1-time");
  div_player2_time = document.getElementById("player2-time");
  div_differential = document.getElementsByClassName("differential")[0];
};

window.onload = initial_setup;
