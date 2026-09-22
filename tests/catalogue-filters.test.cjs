const { test } = require('node:test');
const assert = require('node:assert/strict');
const { titlesForPage, categoriesForPage } = require('../packages/media-catalogue/browser/catalogue-filters.js');

const titles = [
  { title: 'Bluey at the Beach', categoryName: 'Kids and Family' },
  { title: 'Space Warriors', categoryName: 'VOD | English' },
  { title: 'Northern Lines', categoryName: 'Box Sets' },
  { title: 'Animated Nightmares', categoryName: 'Adult Horror Animation' }
];
const categories = [
  { id: '1', name: 'Kids and Family' },
  { id: '2', name: 'Box Sets' },
  { id: '3', name: 'VOD | English' },
  { id: '4', name: 'Adult' }
];

test('Kids only returns child and family titles and never falls back to general VOD', () => {
  assert.deepEqual(titlesForPage('kids', titles).map(item => item.title), ['Bluey at the Beach']);
  assert.deepEqual(categoriesForPage('kids', categories).map(item => item.name), ['Kids and Family']);
});

test('Series only returns series and box-set content', () => {
  assert.deepEqual(titlesForPage('series', titles).map(item => item.title), ['Northern Lines']);
  assert.deepEqual(categoriesForPage('series', categories).map(item => item.name), ['Box Sets']);
});

test('Series includes recognised provider categories while movie collections stay in Movies', () => {
  const services = [{ id: '5', name: 'Apple TV+' }, { id: '6', name: 'Paramount+' }, { id: '7', name: 'James Bond Collection' }];
  assert.deepEqual(categoriesForPage('series', services).map(item => item.name), ['Apple TV+', 'Paramount+']);
  assert.deepEqual(categoriesForPage('movies', services).map(item => item.name), ['James Bond Collection']);
});

test('Explicit Xtream content kinds keep films out of Series and series out of Movies', () => {
  const imported = [{ title: 'Film in a TV Movie category', categoryName: 'TV Movie', kind: 'movie' }, { title: 'A proper series', categoryName: 'Drama', kind: 'series' }];
  assert.deepEqual(titlesForPage('movies', imported).map(item => item.title), ['Film in a TV Movie category']);
  assert.deepEqual(titlesForPage('series', imported).map(item => item.title), ['A proper series']);
});

test('Movies exclude series and child categories while keeping standard VOD titles', () => {
  assert.deepEqual(titlesForPage('movies', titles).map(item => item.title), ['Space Warriors']);
  assert.deepEqual(categoriesForPage('movies', categories).map(item => item.name), ['VOD | English', 'Adult']);
});
