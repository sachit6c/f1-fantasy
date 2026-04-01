import { describe, it, expect, beforeEach } from 'vitest';
import { BaseView } from '../../views/base-view.js';

describe('BaseView', () => {
  let view;

  beforeEach(() => {
    view = new BaseView();
  });

  // ─── createElement ────────────────────────────────────────────────────────

  describe('createElement', () => {
    it('creates an element with the specified tag', () => {
      const el = view.createElement('div');
      expect(el.tagName).toBe('DIV');
    });

    it('creates a non-div element', () => {
      expect(view.createElement('span').tagName).toBe('SPAN');
      expect(view.createElement('p').tagName).toBe('P');
    });

    it('accepts a single class as a string', () => {
      const el = view.createElement('div', 'my-class');
      expect(el.classList.contains('my-class')).toBe(true);
    });

    it('accepts multiple classes as an array', () => {
      const el = view.createElement('div', ['class-a', 'class-b']);
      expect(el.classList.contains('class-a')).toBe(true);
      expect(el.classList.contains('class-b')).toBe(true);
    });

    it('filters empty strings from the class array', () => {
      const el = view.createElement('div', ['valid', '', '   ']);
      expect(el.classList.length).toBe(1);
      expect(el.classList.contains('valid')).toBe(true);
    });

    it('applies no classes when given an empty array', () => {
      const el = view.createElement('div', []);
      expect(el.classList.length).toBe(0);
    });

    it('sets textContent when the text argument is provided', () => {
      const el = view.createElement('p', 'para', 'Hello World');
      expect(el.textContent).toBe('Hello World');
    });

    it('leaves textContent empty when text argument is omitted', () => {
      const el = view.createElement('span', 'my-span');
      expect(el.textContent).toBe('');
    });

    it('returns an HTMLElement instance', () => {
      const el = view.createElement('div', 'cls');
      expect(el).toBeInstanceOf(HTMLElement);
    });
  });

  // ─── createLoadingSpinner ──────────────────────────────────────────────────

  describe('createLoadingSpinner', () => {
    it('returns a div element', () => {
      expect(view.createLoadingSpinner().tagName).toBe('DIV');
    });

    it('has the "loading-spinner" class', () => {
      expect(view.createLoadingSpinner().classList.contains('loading-spinner')).toBe(true);
    });

    it('contains a child element with class "spinner"', () => {
      const spinner = view.createLoadingSpinner();
      expect(spinner.querySelector('.spinner')).not.toBeNull();
    });

    it('contains loading text', () => {
      const spinner = view.createLoadingSpinner();
      expect(spinner.textContent.toLowerCase()).toContain('loading');
    });
  });

  // ─── createErrorMessage ───────────────────────────────────────────────────

  describe('createErrorMessage', () => {
    it('returns a div element', () => {
      expect(view.createErrorMessage('Oops').tagName).toBe('DIV');
    });

    it('has the "error-message" class', () => {
      expect(view.createErrorMessage('Oops').classList.contains('error-message')).toBe(true);
    });

    it('renders the provided message text', () => {
      const el = view.createErrorMessage('Something went wrong');
      expect(el.textContent).toContain('Something went wrong');
    });

    it('renders the warning icon', () => {
      const el = view.createErrorMessage('Oops');
      expect(el.querySelector('.error-icon')).not.toBeNull();
    });

    it('renders the error text in .error-text element', () => {
      const el = view.createErrorMessage('Test error');
      const errorText = el.querySelector('.error-text');
      expect(errorText).not.toBeNull();
      expect(errorText.textContent).toBe('Test error');
    });
  });

  // ─── destroy ──────────────────────────────────────────────────────────────

  describe('destroy', () => {
    it('clears the root innerHTML', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>content</p>';
      view.root = container;
      view.destroy();
      expect(container.innerHTML).toBe('');
    });

    it('sets root to null after destroy', () => {
      view.root = document.createElement('div');
      view.destroy();
      expect(view.root).toBeNull();
    });

    it('does not throw when root is already null', () => {
      view.root = null;
      expect(() => view.destroy()).not.toThrow();
    });
  });

  // ─── render ───────────────────────────────────────────────────────────────

  describe('render', () => {
    it('sets this.root to the container element', async () => {
      const container = document.createElement('div');
      await view.render(container, []);
      expect(view.root).toBe(container);
    });
  });
});
