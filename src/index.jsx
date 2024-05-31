// index.jsx

// Add a fallback for the 'path' module
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { init, locations } from '@contentful/app-sdk';
import axios from 'axios';
import pa11y from 'pa11y';


const QualityCheckApp = ({ sdk }) => {
  const [results, setResults] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const runQualityCheck = async () => {
    setIsRunning(true);
    setResults('Running quality check...');

    try {
      const entryId = sdk.entry.getSys().id;
      const entry = await fetchContentfulEntry(entryId, sdk);
      const { body } = entry.fields;
      const textContent = body['en-US'];

      const grammarErrors = await performGrammarCheck(textContent);
      const readabilityScore = await performReadabilityCheck(textContent);
      const accessibilityErrors = await performAccessibilityCheck(textContent);

      const errors = [];

      if (grammarErrors.length > 0) {
        errors.push(`Grammar Errors: ${JSON.stringify(grammarErrors)}`);
      }
      if (accessibilityErrors.length > 0) {
        errors.push(`Accessibility Errors: ${JSON.stringify(accessibilityErrors)}`);
      }
      errors.push(`Readability score: ${readabilityScore}`);
      if (readabilityScore < 60) {
        errors.push('Content did not pass readability check.');
      }

      await updateContentfulEntry(entry, errors);

      const highlightedContent = highlightErrors(textContent, grammarErrors);
      setResults(highlightedContent + `<pre>Errors: ${errors.join('\n')}</pre>`);
    } catch (error) {
      setResults(`Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div>
      <button onClick={runQualityCheck} disabled={isRunning}>
        Run Quality Check
      </button>
      <div dangerouslySetInnerHTML={{ __html: results }} />
    </div>
  );
};

const fetchContentfulEntry = async (entryId, sdk) => {
  const client = sdk.space.getEnvironment();
  const entry = await client.getEntry(entryId);
  return entry;
};

const performGrammarCheck = async (text) => {
  const response = await axios.post('https://api.grammarbot.io/v2/check', null, {
    params: {
      text: text,
      language: 'en-US',
      apiKey: process.env.GRAMMARBOT_API_KEY,
    },
  });
  return response.data.matches.map((match) => ({
    message: match.message,
    replacements: match.replacements.map((rep) => rep.value),
    offset: match.offset,
    length: match.length,
  }));
};

const performReadabilityCheck = async (text) => {
  const response = await axios.post(
    'https://readable.io/api/text/',
    {
      content: text,
    },
    {
      headers: {
        'x-api-key': process.env.READABLE_IO_API_KEY,
        'Content-Type': 'application/json',
      }
    }
  );
  return response.data.readability_score;
};

const performAccessibilityCheck = async (content) => {
  const results = await pa11y(content, {
    standard: 'WCAG2AA',
  });
  return results.issues.map((issue) => ({
    message: issue.message,
    type: issue.type,
    selector: issue.selector,
  }));
};

const updateContentfulEntry = async (entry, errors) => {
  entry.fields.errors = {
    'en-US': errors,
  };
  const updatedEntry = await entry.update();
  await updatedEntry.publish();
};

const highlightErrors = (text, errors) => {
  let highlightedText = '';
  let currentIndex = 0;

  errors.forEach((error) => {
    highlightedText += text.slice(currentIndex, error.offset);
    highlightedText += `<span class="error">${text.slice(
      error.offset,
      error.offset + error.length
    )}</span>`;
    currentIndex = error.offset + error.length;
  });

  highlightedText += text.slice(currentIndex);
  return highlightedText;
};

init((sdk) => {
  if (sdk.location.is(locations.LOCATION_ENTRY_SIDEBAR)) {
    ReactDOM.render(<QualityCheckApp sdk={sdk} />, document.getElementById('root'));
  }
});
