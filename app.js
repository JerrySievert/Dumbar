/*
 * Dumbar - a simple menu bar for LLM.
 *
 * Copyright 2023 Jerry Sievert
 * https://github.com/JerrySievert/Dumbar
 */

const Parser = require('jsonparse');

/* Our error message, in case anything goes wrong. */
const error_message = `<div class="error">Unable to connect to Ollama.<br><br>Is it running?</div>`;

/*
 * read_chunks
 *
 * Reads streaming data from a reader, returning an iterator.
 */
const read_chunks = (reader) => {
  return {
    async *[Symbol.asyncIterator]() {
      let readResult = await reader.read();
      while (!readResult.done) {
        yield readResult.value;
        readResult = await reader.read();
      }
    }
  };
};

/*
 * get_pref
 *
 * Reads a preference item from localStorage, returning null if it is
 * either unset or blank.
 */
const get_pref = (which) => {
  const pref = localStorage.getItem(which);
  if (pref == '') {
    return null;
  }

  return pref;
};

/*
 * get_models
 *
 * Retrieve all known models from the Ollama API endpoint.  On error,
 * write the standard error message into the results.
 */
const get_models = async () => {
  const host =
    get_pref('prefs:host') !== null ? get_pref('prefs:host') : '127.0.0.1';

  const port = get_pref('prefs:port') !== null ? get_pref(prefs.port) : 11434;
  const url = `http://${host}:${port}`;

  try {
    fetch(`${url}/api/tags`)
      .then(async (response) => {
        const models = await response.json();

        const eModel = document.getElementById('model');
        eModel.innerHTML = '';

        for (let model of models.models) {
          const option = document.createElement('option');
          option.text = model.name;
          option.value = model.name;

          eModel.add(option);
        }
      })
      .catch((err) => {
        document.getElementById('spinner').classList.add('hidden');
        resultsWindow.innerHTML = error_message;
      });
  } catch (err) {
    console.log(err);
  }
};

/*
 * query
 *
 * Read the model and prompt from the UI and make a query, writing the results
 * into the results element as they arrive.  On error, write the standard error
 * message.
 */
const query = async () => {
  const eModel = document.getElementById('model');
  const model = eModel.value;

  const ePrompt = document.getElementById('prompt');
  const prompt = ePrompt.value;

  document.getElementById('spinner').classList.remove('hidden');
  const body = {
    model,
    prompt
  };

  const resultsWindow = document.getElementById('results');
  resultsWindow.innerText = '';

  let response;

  const host = get_pref('prefs:host') ? get_pref('prefs:host') : '127.0.0.1';
  const port = get_pref('prefs:port') ? get_pref(prefs.port) : 11434;
  const url = `http://${host}:${port}`;

  try {
    let utf8decoder = new TextDecoder();

    fetch(`${url}/api/generate`, {
      method: 'post',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    })
      .then(async (response) => {
        document.getElementById('spinner').classList.add('hidden');

        const reader = response.body.getReader();
        const parser = new Parser();
        parser.onValue = (value) => {
          if (value.response) {
            resultsWindow.innerText += value.response;
          }
        };

        for await (const chunk of read_chunks(reader)) {
          let str = utf8decoder.decode(chunk.buffer);
          parser.write(str);
        }
      })
      .catch((err) => {
        document.getElementById('spinner').classList.add('hidden');
        resultsWindow.innerHTML = `<div class="error">Unable to connect to Ollama.<br><br>Is it running?</div>`;
      });
  } catch (err) {
    console.log(err);
  }
};

/*
 * show_preferences
 *
 * Show the preferences dialog pane, set the current values.
 */
const show_preferences = () => {
  const host = document.getElementById('host');
  host.value = localStorage.getItem('prefs:host');

  const port = document.getElementById('port');
  port.value = localStorage.getItem('prefs:port');

  const prefPane = document.getElementById('preferences');
  prefPane.classList.remove('hidden');
};

/*
 * prefs_cancel
 *
 * Cancel out of the preferences pane, setting things back to normal.
 */
const prefs_cancel = () => {
  const host = document.getElementById('host');
  host.value = '';

  const port = document.getElementById('port');
  port.value = '';

  const prefPane = document.getElementById('preferences');
  prefPane.classList.add('hidden');
};

/*
 * prefs_save
 *
 * Save the new preferences, then call for the models again from Ollama.
 */
const prefs_save = () => {
  const host = document.getElementById('host');
  localStorage.setItem('prefs:host', host.value);

  const port = document.getElementById('port');
  localStorage.setItem('prefs:port', port.value);

  const prefPane = document.getElementById('preferences');
  prefPane.classList.add('hidden');

  const resultsWindow = document.getElementById('results');
  resultsWindow.innerText = '';

  get_models();
};

/* Set up click handlers for all of the buttons. */
const searchButton = document.getElementById('query');
searchButton.onclick = query;

const prefsButton = document.getElementById('prefs');
prefsButton.onclick = show_preferences;

const saveButton = document.getElementById('save');
saveButton.onclick = prefs_save;

const cancelButton = document.getElementById('cancel');
cancelButton.onclick = prefs_cancel;

/* Start off by retrieving the models. */
get_models();
