require('../node_modules/skeleton-framework/dist/skeleton.min.css');
require('./styles.css');
require('process');

let AUTHRORIZED = false;
const API_BASE_URL = process.env.API_BASE_URL;
console.log(API_BASE_URL);

// Utility functions
const getToken = () => {
  return localStorage.getItem('swiss-token');
}

const getAuthState = () => {
  return AUTHRORIZED;
}

const setAuthState = (val) => {
  AUTHRORIZED = val;
}

// Return a serialized json object from a form
// from https://barker.codes/blog/serialize-form-data-into-a-json-string-in-vanilla-js
const getSerializedJSONFromForm = (formId, addOns={}) => {
  const formData = new FormData(formId);
  const pairs = {};
  for (const [name, value] of formData) {
    pairs[name] = value;
  }
  for (const [name, value] of Object.entries(addOns)) {
    pairs[name] = value;
  }
  return JSON.stringify(pairs);
}

const getRequestBodyFromParams = (formId) => {
  const form = new FormData(document.getElementById(formId));
  const searchParams = new URLSearchParams();

  /**
    * This is all to replace this single line:
    * new URLSearchParams(formData), because Edge
    */
  const keys = [...form.keys()];
  keys.forEach(key => {
    /**
     * For 'checkboxes', we need to append the values to the search params
     * and not just add a comma separated string.
     */
    if (keys.filter(x => x === key).length > 1) {
      /**
       * We grab all the values and append them in one go
       */
      form.getAll(key).forEach(value => {
        searchParams.append(key, value);
      })

      /**
       * Then remove all the remaining instances of the key from the
       * keys array we're looping around
       */
      keys.forEach((k, i) => {
        if (k === key) {
          keys.splice(i, 1)
        }
      })
    } else {
      // Strings are simple in comparison
      searchParams.set(key, form.get(key))
    }
  })

  return searchParams.toString();
}

const clearPage = () => {
  let navBar = document.getElementById('nav-bar-container');
  navBar.remove();
  const root = document.getElementById('root');
  navBar = renderNav();
  root.prepend(navBar);
  const container = document.getElementById('container');
  if (container) {
    container.remove();
  }
  const tournamentButtonGroup = document.getElementById('tournamentGroup');
  if (tournamentButtonGroup) {
    tournamentButtonGroup.remove();
  }
  const compGroup = document.getElementById('compGroup');
    if (compGroup) {
      compGroup.remove();
    }
}

// Create User
const createUser = (e) => {
  e.preventDefault();
  const requestBody = getRequestBodyFromParams('createUserForm');
  fetch(`${API_BASE_URL}/users`, {
    method: 'POST', 
    mode: 'cors',
    body: requestBody,
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    redirect: 'follow',
    referrerPolicy: 'no-referrer'
  })
  .then(response => {
    if (response.status >= 200 && response.status <= 299) {
      let args = {
        'requestBody': requestBody,
      }
      authorizeUser(args);
      return response.json();
    } else {
      const form = document.getElementsByTagName('form')[0];
      let errorMessage = document.getElementsByClassName('error-message');
      if (errorMessage.length > 0) {
        for (let m of errorMessage) {
          m.remove();
        }
      }
      errorMessage = document.createElement('p');
      errorMessage.classList.add('error-message', 'u-pull-right');
      errorMessage.textContent = 'Something went wrong. Please try again.';
      form.parentNode.appendChild(errorMessage);
      throw new Error(response.statusText);
    }
  })
  .catch(error => console.log(error));
}

const handleAuthUser = (e) => {
  e.preventDefault();
  const requestBody = getRequestBodyFromParams('loginForm');
  let args = {
    'requestBody': requestBody,
  }
  authorizeUser(args);
}

// Authorize User
const authorizeUser = (args) => {
  let requestBody = null;
  if (args['requestBody']) {
    requestBody = args['requestBody'];
  } else {
    requestBody = getRequestBodyFromParams('loginForm');
  }
  fetch(`${API_BASE_URL}/token`, {
    method: 'POST',
    mode: 'cors',
    body: requestBody,
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    redirect: 'follow',
    referrerPolicy: 'no-referrer'
  })
  .then(response => {
    if (response.status >= 200 && response.status <= 299) {
      return response.json();
    } else {
      const form = document.getElementsByTagName('form')[0];
      let errorMessage = document.getElementsByClassName('error-message');
      if (errorMessage.length > 0) {
        for (let m of errorMessage) {
          m.remove();
        }
      }
      errorMessage = document.createElement('p');
      errorMessage.classList.add('error-message', 'u-pull-right');
      errorMessage.textContent = 'Something went wrong. Please try again.';
      form.parentNode.appendChild(errorMessage);
      throw new Error(response.statusText);
    }
  })
  .then(jsonData => {
    localStorage.setItem('swiss-token', jsonData['access_token']);
    setAuthState(true);
    onNavigate('/home');
  })
  .catch(error => console.log(error));
}

const getCurrentUser = () => {
  return fetch(`${API_BASE_URL}/users/me`, {
    method: 'GET', 
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    },
    redirect: 'follow',
    referrerPolicy: 'no-referrer'
  })
  .then(response => {
    if (response.status >= 200 && response.status <= 299) {
      return response.json();
    } else if (response.status == 401) {
      logout();
    }
  })
  .then(jsonData => {
    return jsonData;
  })
  .catch(error => console.log(error));
}

// Tournament component
const tournamentComponent = (tournamentData) => {
  const displayContainer = document.createElement('div');
  displayContainer.classList.add('display-container');
  const tournamentName = document.createElement('h6');
  tournamentName.classList.add('display-container-title');
  tournamentName.textContent = tournamentData.name;
  displayContainer.appendChild(tournamentName);
  displayContainer.addEventListener('click', () => onNavigate('/competitors', {'tournament': tournamentData}));
  return displayContainer;
}

// Get tournaments
const getTournaments = () => {
  fetch(`${API_BASE_URL}/tournaments`, {
    method: 'GET', 
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    },
    redirect: 'follow',
    referrerPolicy: 'no-referrer'
  })
  .then(response => {
    if (response.status >= 200 && response.status <= 299) {
      return response.json();
    } else if (response.status == 401) {
      logout();
    } else if (response.status == 404) {
      console.log('404');
    }
  })
  .then(jsonData => {
    let rowContainer = document.getElementById('tournamentListContainer');
    if (rowContainer) {
      rowContainer.remove();
    }
    const container = document.getElementById('container');
    if (jsonData.length == 0) {
      const group = document.createElement('div');
      group.setAttribute('id', 'tournamentGroup');
      const el = document.createElement('p');
      el.textContent = 'Add a tournament to get started!';
      group.appendChild(el);
      container.appendChild(group);
    } else {
      rowContainer = document.createElement('div');
      rowContainer.setAttribute('id', 'tournamentListContainer');
      rowContainer.classList.add('list-container');
      let row = null;
      for (let i = 0; i < jsonData.length; i++) {
        if (i % 4 == 0) {
          row = document.createElement('div');
          row.classList.add('row'); 
          rowContainer.appendChild(row);
          allRows = rowContainer.querySelectorAll('.row');
          row = allRows[allRows.length - 1];
        }
        let column = document.createElement('div');
        column.setAttribute('id', jsonData[i].id);
        column.classList.add('three', 'columns', 'tournament');
        const tournamentContainer = tournamentComponent(jsonData[i]);
        column.appendChild(tournamentContainer);
        row.appendChild(column);
      }
      container.appendChild(rowContainer);
      const tournamentButtonGroup = document.getElementById('tournamentGroup');
      if (tournamentButtonGroup) {
        tournamentButtonGroup.remove();
      }
    }

    const group = document.createElement('div');
    group.setAttribute('id', 'tournamentGroup');
    const args = {
      'formFieldNamesList': ['name', 'description']
    }
    const addButton = addTournamentButton('Add Tournament', args);
    group.appendChild(addButton);
    container.appendChild(group);
  })
  .catch(error => console.log(error));
}

// Create Tournament
const createTournament = (e, args=null) => {
  e.preventDefault();
  const form = document.getElementById('createTournamentForm');
  jsonBody = getSerializedJSONFromForm(form);
  fetch(`${API_BASE_URL}/tournaments`, {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    },
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
    body: jsonBody
  })
  .then(response => {
    if (response.status >= 200 && response.status <= 299) {
      return response.json();
    } else if (response.status == 401) {
      logout();
    }
  })
  .then(jsonData => {
    if (!args) {
      const form = document.getElementById('createTournamentForm');
      const buttonGroup = document.getElementById('tournamentGroup');
      form.remove();
      buttonGroup.remove();
    }

    if (args && args['competitors']) {
      for (let w = 0; w < args['competitors'].length; w++) {
        args['tournament'] = jsonData;
        args['jsonBody'] = {'name': args['competitors'][w].name, 'tournament_id': jsonData.id};
        createCompetitor(args);
      }
    }
    const navContainer = document.getElementsByClassName('nav-container')[0];
    allRows = navContainer.getElementsByClassName('row');

    while (allRows[0] != undefined) {
      allRows[0].remove();
    }
    setTimeout(onNavigate('/competitors', {'tournament': jsonData}), 3000);
  })
  .catch(error => console.log(error));
}

// Update Tournament
const updateTournament = (args) => {
  const jsonBody = args['jsonBody'];
  return fetch(`${API_BASE_URL}/tournaments`, {
    method: 'PUT',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    },
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
    body: JSON.stringify(jsonBody)
  })
  .then(response => {
    if (response.status >= 200 && response.status <= 299) {
      return response.json();
    } else if (response.status == 401) {
      logout();
    }
  })
  .then(jsonData => {
    return jsonData;
  })
  .catch(error => console.log(error));
}

// Get Competitors
const getCompetitors = (args) => {
  let tournamentId = null;
  if (args['jsonBody']) {
    // If creating a new tournament as a tie breaker then this is the new tournament id
    tournamentId = args['jsonBody']['tournament_id'];
    args['tournament']['complete'] = false; // so correct button group shows
  } else {
    // Current Tournament id
    tournamentId = args['tournament'].id;
  }
  const tournamentButtonGroup = document.getElementById('tournamentGroup');
  if (tournamentButtonGroup) {
    tournamentButtonGroup.remove();
  }
  const cancelButton = document.getElementById('cancelAddComp');
  if (cancelButton) {
    cancelButton.remove();
  }
  fetch(`${API_BASE_URL}/competitors?tournament_id=${tournamentId}`, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    },
    redirect: 'follow',
    referrerPolicy: 'no-referrer'
  })
  .then(response => {
    if (response.status >= 200 && response.status <= 299) {
      return response.json();
    } else if (response.status == 401) {
      logout();
    } else if (response.status == 404) {
      console.log('404'); // TODO: remove and refactor create generic error page
    }
  })
  .then(jsonData => {
    let rowContainer = document.getElementById('competitorListContainer');
    if (rowContainer) {
      rowContainer.remove();
    }
    const compGroup = document.getElementById('compGroup');
    if (compGroup) {
      compGroup.remove();
    }
    const container = document.getElementById('container');
    const description = document.createElement('p');
    description.textContent = args['tournament'].description;
    container.appendChild(description);
    if (jsonData.length == 0) {
      const group = document.createElement('div');
      group.setAttribute('id', 'no-comp-message');
      const el = document.createElement('p');
      el.textContent = 'Add competitors to your tournament to get started!';
      group.appendChild(el);
      container.appendChild(group);
    } else {
      rowContainer = document.createElement('div');
      rowContainer.setAttribute('id', 'competitorListContainer');
      rowContainer.classList.add('list-container');
      let row = null;
      for (let i = 0; i < jsonData.length; i++) {
        row = document.createElement('div');
        row.setAttribute('id', i);
        row.classList.add('row'); 
        rowContainer.appendChild(row);
        allRows = rowContainer.getElementsByClassName('row');
        row = allRows[allRows.length - 1];
        colHeaders = ['name'];
        for (let j = 0; j < colHeaders.length; j++) {
          let column = document.createElement('div');
          column.classList.add('three', 'columns');
          column.textContent = jsonData[i][colHeaders[j]];
          row.appendChild(column);
        }
      }
      container.appendChild(rowContainer);
    }
  
    const group = document.createElement('div');
    group.setAttribute('id', 'compGroup');
    const backButton = navButton('Back', '/home');
    args['competitors'] = jsonData;
    if (args['tournament'].complete) {
      onNavigate('/result', args);
    } else if (args['tournament'].in_progress) {
      const resumeButton = document.createElement('button');
      resumeButton.textContent = 'Resume';
      resumeButton.addEventListener('click', () => getMatchInProgressHandler(args));
      group.append(backButton, resumeButton);
    } else if (jsonData.length < 2) { // Can't start a tournament with less than 2 competitors
      args['formFieldNamesList'] = ['name'];
      const addCompetitorButton = addButton('Add Competitor', args);
      group.append(backButton, addCompetitorButton);
    } else {
      args['formFieldNamesList'] = ['name'];
      const addCompetitorButton = addButton('Add Competitor', args);
      const startTournamentButton = document.createElement('button');
      args['newTournamentId'] = tournamentId;
      startTournamentButton.addEventListener('click', () => matchCompetitors(args));
      startTournamentButton.textContent = 'Start Tournament';
      group.append(backButton, addCompetitorButton, startTournamentButton);
    }
    container.appendChild(group);
  })
  .catch(error => console.log(error));
}

// Create compeititor event handler
const handleCreateCompetitor = (e, args) => {
  if (args['jsonBody']) {
    args['jsonBody'] = null;
  }
  e.preventDefault();
  createCompetitor(args)
}

const createCompetitor = (args) => {
  let tournamentId = null;
  let jsonBody = null;
  if (!args['jsonBody']) {
    const form = document.getElementById('createCompetitorForm');
    tournamentId = args['tournament'].id;
    jsonBody = getSerializedJSONFromForm(form, addOns={'tournament_id': tournamentId});
  } else {
    // New tournament passed
    jsonBody = JSON.stringify(args['jsonBody']);
    tournamentId = args['jsonBody']['tournament_id'];
  }

  fetch(`${API_BASE_URL}/competitors`, {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    },
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
    body: jsonBody
  })
  .then(response => {
    if (response.status >= 200 && response.status <= 299) {
      return response.json();
    } else if (response.status == 401) {
      logout();
    }
  })
  .then(jsonData => {
    const form = document.getElementById('createCompetitorForm');
    if (form) {
      form.remove();
    }
    const buttonGroup = document.getElementById('compGroup');
    if (buttonGroup) {
      buttonGroup.remove();
    }
    if (args['jsonBody']) {
      onNavigate('/competitors', args);
    } else {
      setTimeout(getCompetitors(args), 3000);
    }
  })
  .catch(error => console.log(error));
}

// Match competitors in tournament
const matchCompetitors = (args) => {
  let tournamentId = null;
  if (args['newTournamentId']) {
    tournamentId = args['newTournamentId'];
  } else {
    tournamentId = args['tournament'].id;
  }

  fetch(`${API_BASE_URL}/matches/match_competitors?tournament_id=${tournamentId}`, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    },
    redirect: 'follow',
    referrerPolicy: 'no-referrer'
  })
  .then(response => {
    if (response.status >= 200 && response.status <= 299 || response.status == 404) {
      return response.json();
    } else if (response.status == 401) {
      logout();
    }
  })
  .then(jsonData => {
    if (jsonData.length == 0) {
      const obj =  {
        'id': args['tournament'].id,
        'name': args['tournament'].name,
        'description': args['tournament'].description,
        'in_progress': null,
        'in_progress_round': null,
        'complete': true
      }
      args['jsonBody'] = obj;
      updateTournament(args);
      setTimeout(onNavigate('/result', args), 10000);
    } else {
      args['matches'] = jsonData;
      args['tournamentId'] = tournamentId;
      onNavigate('/match', args);
    } 
  })
  .catch(error => console.log(error));
}

// Handle update
const handleUpdateMatch = (e, index, args) => {
  const winnerId = parseInt(e.target.attributes['winner-id'].value);
  const loserId = winnerId == args['matches'][index]['competitor_one'] ?
    args['matches'][index]['competitor_two'] :
    args['matches'][index]['competitor_one'];

  args['matches'][index]['winner_id'] = winnerId;
  args['matches'][index]['loser_id'] = loserId;
  updateMatch(index, args);
}

// Update match with winner and loser
const updateMatch = (index, args) => {
  const matchData = args['matches'][index];

  jsonBody = {
    'tournament_id': matchData['tournament_id'],
    'competitor_one': matchData['competitor_one'],
    'competitor_two': matchData['competitor_two'],
    'round': matchData['round'],
    'winner_id': matchData['winner_id'],
    'loser_id': matchData['loser_id'],
    'id': matchData['id']
  }

  fetch(`${API_BASE_URL}/matches`, {
    method: 'PUT',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    },
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
    body: JSON.stringify(jsonBody)
  })
  .then(response => {
    if (response.status >= 200 && response.status <= 299 || response.status == 404) {
      return response.json();
    } else if (response.status == 401) {
      logout();
    }
  })
  .then(jsonData => {
    if (index < args['matches'].length - 1) {
      displayMatch(index + 1, args);
    } else {
      matchCompetitors(args);
    }
  })
  .catch(error => console.log(error));
}

// Get a match currently in progress
const getMatchInProgressHandler = (args) => {
  const tournamentId = args['tournament'].id;
  const matchId = args['tournament'].in_progress;
  const round = args['tournament'].in_progress_round;
  // Get all matches
  // fetch to get matches endpoint
  fetch(`${API_BASE_URL}/matches?tournament_id=${tournamentId}&round=${round}`, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    },
    redirect: 'follow',
    referrerPolicy: 'no-referrer'
  })
  .then(response => {
    if (response.status >= 200 && response.status <= 299) {
      return response.json();
    } else if (response.status == 401) {
      logout();
    } else if (response.status == 404) {
      console.log('404'); // TODO: remove and refactor
    }
  })
  .then(jsonData => {
    const inProgressMatchList = jsonData.filter(match => match.winner_id == null && match.id != matchId);
    const inProgressMatch = jsonData.filter(match => match.id == matchId);
    // Move in progress match to the front of the line
    inProgressMatchList.unshift(inProgressMatch[0]);
    args['matches'] = inProgressMatchList;
    displayMatch(0, args);
    onNavigate('/match', args);
  })
  .catch(error => console.log(error));
}

// Logout
const logout = () => {
  localStorage.setItem('swiss-token', '');
  setAuthState(false);
  clearPage();
  onNavigate('/login');
}

// Create login/registration form pass the html id
const createForm = (htmlId, method) => { // TODO: rename to createLoginForm
  // create container
  const container = document.createElement('div');
  container.setAttribute('class', 'u-center-abs');
  // create form
  const form = document.createElement('form');
  form.setAttribute('id', htmlId);
  form.method = method;
  // create row
  const emailRow = document.createElement('div');
  emailRow.setAttribute('class', 'row');
  // create column
  const emailColumn = document.createElement('div');
  emailColumn.setAttribute('class', 'twelve columns');
  // email label and input
  const usernameLabel = document.createElement('label');
  usernameLabel.setAttribute('for', 'emailInput');
  usernameLabel.textContent = 'Email';
  const usernameInput = document.createElement('input');
  usernameInput.name = 'username';
  usernameInput.type = 'email';
  usernameInput.placeholder='test@mailbox.com';

  // create row
  const passwordRow = document.createElement('div');
  passwordRow.setAttribute('class', 'row');
  // create column
  const passwordColumn = document.createElement('div');
  passwordColumn.setAttribute('class', 'twelve columns');
  // password label and input
  const passwordLabel = document.createElement('label');
  passwordLabel.setAttribute('for', 'passwordInput');
  passwordLabel.textContent = 'Password';
  const passwordInput = document.createElement('input');
  passwordInput.name = 'password';
  passwordInput.type = 'password';
  passwordInput.placeholder='password';
  // submit button
  const submitButton = document.createElement('button');
  submitButton.classList.add('button-primary', 'u-pull-right');
  submitButton.setAttribute('type', 'submit');
  if (htmlId == 'loginForm') {
    submitButton.textContent = 'Login';
  }
  if (htmlId == 'createUserForm') {
    submitButton.textContent = 'Register';
  }
  
  // append children
  emailColumn.append(usernameLabel, usernameInput);
  emailRow.appendChild(emailColumn);
  passwordColumn.append(passwordLabel, passwordInput);
  passwordRow.appendChild(passwordColumn);
  form.append(emailRow, passwordRow, submitButton);
  container.appendChild(form);
  return container;
}

// Competitor component for displaying a matched competitor
const competitorComponent = (competitor, index, args) => {
  const displayContainer = document.createElement('div');
  displayContainer.classList.add('display-container');
  displayContainer.setAttribute('winner-id', competitor.id);
  const compName = document.createElement('h6');
  compName.setAttribute('winner-id', competitor.id);
  compName.classList.add('display-container-title');
  compName.textContent = competitor.name;
  displayContainer.addEventListener('click', e => handleUpdateMatch(e, index, args));
  displayContainer.appendChild(compName);
  return displayContainer;
}

// displayMatch
const displayMatch = (index, args) => {
  const match = args['matches'][index];
  if (args['tournament']) {
    const obj =  {
      'id': args['tournament'].id,
      'name': args['tournament'].name,
      'description': args['tournament'].description,
      'in_progress': match.id,
      'in_progress_round': match.round,
      'complete': false
    }
    args['jsonBody'] = obj;
    updateTournament(args);
  }
  
  // if there is a match already displayed clear it
  let matchContainer = document.getElementById('match-group');
  if (matchContainer) {
    matchContainer.remove();
  }

  if (!match.competitor_two) {
    updateMatch(index, args);
  } else {
    matchContainer = document.createElement('div');
    matchContainer.setAttribute('id', 'match-group');
    const row = document.createElement('div');
    row.setAttribute('class', 'row');
    for (let i = 0; i < 3; i++) {
      const col = document.createElement('div');
      col.setAttribute('class', 'four columns');
      if (i == 1) {
        // middle of the two competitors
        const vs = document.createElement('h6');
        vs.textContent = 'VS';
        col.appendChild(vs);
      } else {
        const competitorId = i == 0 ? match.competitor_one : match.competitor_two;
      const competitor = args['competitors'].filter((el) => el.id == competitorId);
      // const competitorName = competitor[0]['name'];
      // const col = document.createElement('div');
      // col.setAttribute('class', 'four columns');
      // col.setAttribute('winner-id', competitorId);
      // col.textContent = competitorName;
      // col.addEventListener('click', e => handleUpdateMatch(e, index, args));
      const compContainer = competitorComponent(competitor[0], index, args);
      col.appendChild(compContainer);
      }

      row.appendChild(col)
    }
    matchContainer.append(row);
    const container = document.getElementById('container');
    container.appendChild(matchContainer);
  }
}

const getMatchingCompetitorById = (compId, compList) => {
  for (let k = 0; k < compList.length; k++) {
    if (compList[k]['id'] == compId) {
      return compList[k];
    }
  }
}

// Display tournament results
const displayResult = (args) => {
  let tournamentId = null;
  if (args['newTournamentId']) {
    tournamentId = args['newTournamentId']; 
  } else {
    tournamentId = args['tournament'].id;
  }

  fetch(`${API_BASE_URL}/matches?tournament_id=${tournamentId}`, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    },
    redirect: 'follow',
    referrerPolicy: 'no-referrer'
  })
  .then(response => {
    if (response.status >= 200 && response.status <= 299 || response.status == 404) { // TODO: is that what I want to happen with a 404?
      return response.json();
    } else if (response.status == 401) {
      logout();
    }
  })
  .then(jsonData => {
    const resultMap = {};
    const competitors = args['competitors'];
    const container = document.getElementById('container');
    let maxWinsInt = 0;
    for (let i = 0; i < jsonData.length; i++) {
      const winner = getMatchingCompetitorById(jsonData[i].winner_id, competitors);
      const loser = getMatchingCompetitorById(jsonData[i].loser_id, competitors);
      if (winner) {
        const winnerId = winner['id'];
        if (!resultMap[winnerId]) {
          resultMap[winnerId] = {
            'name': winner['name'],
            'wins': 1,
            'losses': 0
          }
        } else {
          ++resultMap[winnerId]['wins'];
        }
        if (resultMap[winnerId]['wins'] > maxWinsInt) {
          maxWinsInt = resultMap[winner['id']]['wins'];
        }

        const loserId = loser['id'];
        if (!resultMap[loserId]) {
          resultMap[loserId] = {
            'name': loser['name'],
            'wins': 0,
            'losses': 1
          }
        } else {
          ++resultMap[loserId]['losses'];
        }
      }
    }
    let winners = [];
    const tableContainer = document.createElement('div');
    tableContainer.classList.add('list-container');
    const winnerSubtitle = document.createElement('h6');
    winnerSubtitle.textContent = winners.length > 1 ? 'Winner' : 'Winners';
    container.appendChild(winnerSubtitle);
    const table = document.createElement('table');
    table.classList.add('u-full-width');
    const tHead = document.createElement('thead');
    const tHeadRow = document.createElement('tr');
    for (let i of ['Winner', 'Wins', 'Losses']) {
      let th = document.createElement('th');
      th.textContent = i;
      tHeadRow.appendChild(th)
    }
    tHead.appendChild(tHeadRow);
    table.appendChild(tHead);
    const tBody = document.createElement('tbody');
    for (let [key, val] of Object.entries(resultMap)) { // TODO: refacor into one table append process
      if (val['wins'] == maxWinsInt) {        
        const tBodyRow = document.createElement('tr');
        const tDataName = document.createElement('td');
        tDataName.textContent = val['name'];
        const tDataWins = document.createElement('td');
        tDataWins.textContent = val['wins'];
        const tDataLosses = document.createElement('td');
        tDataLosses.textContent = val['losses'];
        tBodyRow.append(tDataName, tDataWins, tDataLosses);
        tBody.appendChild(tBodyRow);
        const competitor = competitors.filter(c => c.id == key);
        winners.push(competitor[0]);
      }
      table.appendChild(tBody);
      tableContainer.appendChild(table);
    }  
    const subTitle = document.createElement('h6');
    subTitle.textContent = 'Win/Loss Breakdown';
    tableContainer.appendChild(subTitle);

    const breakdownTable = document.createElement('table')
    breakdownTable.classList.add('u-full-width');
    const breakdownTableHead = document.createElement('thead');
    const breakdownTableHeadRow = document.createElement('tr');
    for (let i of ['Competitor', 'Wins', 'Losses',]) {
      let breakdownTableHeadData = document.createElement('th');
      breakdownTableHeadData.textContent = i;
      breakdownTableHeadRow.appendChild(breakdownTableHeadData);
    }
    breakdownTableHead.appendChild(breakdownTableHeadRow);
    breakdownTable.appendChild(breakdownTableHead);
    const breakdownTableBody = document.createElement('tbody');

    for (let [key, val] of Object.entries(resultMap)) {
      const breakdownTableBodyRow = document.createElement('tr');
      const breakdownTableDataName = document.createElement('td');
      breakdownTableDataName.textContent = val['name'];
      const breakdownTableDataWins = document.createElement('td');
      breakdownTableDataWins.textContent = val['wins'];
      const breakdownTableDataLosses = document.createElement('td');
      breakdownTableDataLosses.textContent = val['losses'];
      breakdownTableBodyRow.append(breakdownTableDataName, breakdownTableDataWins, breakdownTableDataLosses);
      breakdownTableBody.appendChild(breakdownTableBodyRow);
    }
    breakdownTable.appendChild(breakdownTableBody);
    tableContainer.appendChild(breakdownTable);
    container.appendChild(tableContainer);

    // Match History
    const matchHistorySubTitle = document.createElement('h6');
    matchHistorySubTitle.textContent = 'Match History';
    tableContainer.appendChild(matchHistorySubTitle);
    const historyTable = document.createElement('table');
    historyTable.classList.add('u-full-width');
    const historyTableHead = document.createElement('thead');
    const historyTableHeadRow = document.createElement('tr');
    for (let i of ['Round', 'Competitor', 'Competitor', 'Winner']) {
      let historyTableHeadData = document.createElement('th');
      historyTableHeadData.textContent = i;
      historyTableHeadRow.appendChild(historyTableHeadData);
    }
    historyTableHead.appendChild(historyTableHeadRow);
    historyTable.appendChild(historyTableHead);
    const historyTableBody = document.createElement('tbody');

    for (let [key, val] of Object.entries(jsonData)) {
      // WORKING HERE need to refactor all the tables to DRY it out
      const historyTableBodyRow = document.createElement('tr');
      const historyTableBodyDataRound = document.createElement('td');
      historyTableBodyDataRound.textContent = val['round'];
      const historyTableDataCompOne = document.createElement('td');
      historyTableDataCompOne.textContent = resultMap[val['competitor_one']].name;
      const historyTableDataCompTwo = document.createElement('td');
      historyTableDataCompTwo.textContent = resultMap[val['competitor_two']].name;
      const historyTableDataWinner = document.createElement('td');
      historyTableDataWinner.textContent = resultMap[val['winner_id']].name;
      historyTableBodyRow.append(
        historyTableBodyDataRound,
        historyTableDataCompOne,
        historyTableDataCompTwo,
        historyTableDataWinner
      );
      historyTableBody.appendChild(historyTableBodyRow);
    }
    
    historyTable.appendChild(historyTableBody);
    container.appendChild(historyTable);

    if (winners.length > 1) {
      args['competitors'] = winners;
      args['formFieldNamesList'] = ['name', 'description'];
      const addTButton = addTournamentButton('Add Winners to New Tournament', args);
      container.appendChild(addTButton);
    }
  })
  .catch(error => console.log(error));
}

// Pages
const createPageContainer = (parent, headingText) => {
  const container = document.createElement('div');
  container.classList.add('nav-container');
  container.setAttribute('id', 'container');
  const heading = document.createElement('h5');
  heading.classList.add('u-cent-abs');
  heading.textContent = headingText;
  container.appendChild(heading);
  parent.appendChild(container);
  return parent;
}
const result = (parent, args) => {
  createPageContainer(parent, args['tournament'].name);
  displayResult(args);
}

const match = (parent, args) => {
  const matches = args['matches'];
  createPageContainer(parent, `${args['tournament'].name} Round ${matches[0].round + 1}`);
  displayMatch(0, args);
}

const competitors = (parent, args) => {
  createPageContainer(parent, args['tournament'].name);
  getCompetitors(args);
}

const home = (parent) => {
  clearPage();
  createPageContainer(parent, 'Tournaments');
  getTournaments();
}

const createLoginRegistrationContainer = () => {
  const container = document.createElement('div');
  container.classList.add('nav-container');
  container.setAttribute('id', 'container');
  return container;
}

const register = (parent) => {
  const container = createLoginRegistrationContainer();
  const registrationForm = createForm('createUserForm', 'POST');
  registrationForm.addEventListener('submit', e => createUser(e));
  container.appendChild(registrationForm)
  parent.appendChild(container);
}

const login = (parent) => {
  const container = createLoginRegistrationContainer();
  const loginForm = createForm('loginForm', 'POST');
  loginForm.addEventListener('submit', e => handleAuthUser(e));
  container.appendChild(loginForm);
  parent.appendChild(container);
}

// Navigation
const onNavigate = (path, args={}) => {
  const root = document.getElementById('root');
  const container = document.getElementById('container');
  if (container) {
    container.remove();
  }

  clearPage();

  if (path == '/login') {
    if (getAuthState()) {
      onNavigate('/home');
    } else {
      login(root);
    }
  } else if (path == '/register') {
    if (getAuthState()) {
      onNavigate('/home');
    } else {
      register(root);
    }
  } else if (path == '/home') {
    if (getAuthState()) {
      
      home(root);
    } else {
      window.history.pushState({}, path, '');
    }
  } else if (path == '/competitors') {
    if (getAuthState()) {
      competitors(root, args);
    } else {
      window.history.pushState({}, path, '');
    }
  } else if (path == '/match') {
    if (getAuthState()) {
      match(root, args);
    } else {
      window.history.pushState({}, path, '');
    }
  } else if (path == '/result') {
    if (getAuthState()) {
      result(root, args);
    } else {
      window.history.pushState({}, path, '');
    }
  } else {
    if (getCurrentUser() != null) {
      setAuthState(true);
      onNavigate('/home');
    } else {
      onNavigate('')
    }
  }
}

const renderNav = () => {
  let routes = ['home', 'login', 'register', 'logout'];
    if (getAuthState()) {
      routes = ['home', 'logout'];
    } else {
      routes = ['home', 'login', 'register'];
    }
    const navBar = document.createElement('div');
    navBar.setAttribute('id', 'nav-bar-container');
    const row = document.createElement('div');
    row.classList.add('row');
    navBar.appendChild(row);
    let column = null;
    for (let i = 0; i < routes.length; i++) {
      const route = '/' + routes[i];
      column = document.createElement('div');
      column.classList.add('one', 'columns', 'nav-column');
      column.textContent = routes[i];
  
      if (route == '/logout') {
        column.addEventListener('click', () => logout());
      } else {
        column.addEventListener('click', () => onNavigate(route));
      }
      row.appendChild(column);
    }
  return navBar;
}

const navButton = (text, route) => {
  const backButton = document.createElement('button');
  backButton.textContent = text;
  backButton.addEventListener('click', () => onNavigate(route));
  return backButton;
}

const createTournamentInputFields = (args) => {
  const navContainer = document.getElementsByClassName('nav-container')[0];
  const keyList = args['formFieldNamesList'];
  const form = document.createElement('form');
  form.setAttribute('id', 'createTournamentForm');
  form.addEventListener('submit', e => createTournament(e, args));
 
  for (let i = 0; i < keyList.length; i++) {
    // create row
    const row = document.createElement('div');
    row.setAttribute('class', 'row');
    // create column
    const col = document.createElement('div');
    col.setAttribute('class', 'twelve columns');
    // label and input
    const label = document.createElement('label');
    label.setAttribute('for', 'col');
    label.textContent = keyList[i];
    const input = document.createElement('input');
    input.name = keyList[i];
    input.type = 'text';
    input.placeholder=keyList[i];
    // append
    col.append(label, input);
    row.appendChild(col);
    form.append(row);
    navContainer.appendChild(form);
  }
  // submit button
  const submitButton = document.createElement('button');
  submitButton.classList.add('button');
  submitButton.setAttribute('type', 'submit');
  submitButton.textContent = 'Submit';
  form.appendChild(submitButton);
  // Cancel Button
  const tournamentButtonContainer = document.getElementById('tournamentGroup');
  if (tournamentButtonContainer) {
    tournamentButtonContainer.remove();
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => onNavigate('/home'));
    navContainer.appendChild(cancelButton);
  }
}

const createUserInputFields = (args) => {
  const tournamentId = args['tournament'].id;
  const keyList = args['formFieldNamesList'];
  const navContainer = document.getElementsByClassName('nav-container')[0];
  const form = document.createElement('form');
  form.setAttribute('id', 'createCompetitorForm');
  form.addEventListener('submit', e => handleCreateCompetitor(e, args));
 
  for (let i = 0; i < keyList.length; i++) {
    // create row
    const row = document.createElement('div');
    row.setAttribute('class', 'row');
    // create column
    const col = document.createElement('div');
    col.setAttribute('class', 'twelve columns');
    // label and input
    const label = document.createElement('label');
    label.setAttribute('for', 'col');
    label.textContent = keyList[i];
    const input = document.createElement('input');
    input.name = keyList[i];
    input.type = 'text';
    input.placeholder=keyList[i];
    // append
    col.append(label, input);
    row.appendChild(col);
    form.append(row);
    navContainer.appendChild(form);
  }
  // submit button
  const submitButton = document.createElement('button');
  submitButton.classList.add('button');
  submitButton.setAttribute('type', 'submit');
  submitButton.textContent = 'Submit';
  submitButton.setAttribute('tournamentId', tournamentId);
  form.appendChild(submitButton);

  // Cancel Button
  const compButtonContainer = document.getElementById('compGroup');
  if (compButtonContainer) {
    compButtonContainer.remove();
    const cancelButton = document.createElement('button');
    cancelButton.setAttribute('id', 'cancelAddComp');
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => onNavigate('/competitors', args));
    navContainer.appendChild(cancelButton);
  }
}

const addTournamentButton = (text, args) => {
  const button = document.createElement('button');
  button.textContent = text;
  button.addEventListener('click', () => createTournamentInputFields(args));
  return button;
}

const addButton = (text, args) => {
  const button = document.createElement('button');
  button.textContent = text;
  button.addEventListener('click', e => createUserInputFields(args));
  return button;
}

// Main
let component = () => {
    const root = document.getElementById('root');
    const navBar = renderNav();
    root.appendChild(navBar);
    onNavigate('');
    return root;
  }

  document.body.appendChild(component());