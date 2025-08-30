import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'

@customElement('linear-progress')
export class LinearProgress extends LitElement {
    /** Progress value between 0 and 1, or undefined for indeterminate */
    @property({ type: Number })
    value?: number

    static styles = css`
        :host {
            display: inline-block;
            width: var(--progress-width, 200px);
            height: var(--progress-height, 8px);
            background-color: var(--progress-background, #e0e0e0);
            border-radius: var(--progress-radius, 4px);
            overflow: hidden;
            position: absolute;
            border: 0.5px solid var(--progress-border-color, #ccc);
        }

        .bar {
            height: 100%;
            background-color: var(--progress-color, #3b82f6);
            transition: width 0.3s ease;
        }

        /* Indeterminate animation */
        .indeterminate {
            position: absolute;
            width: 30%;
            height: 100%;
            background-color: var(--progress-color, #3b82f6);
            animation: indeterminate-slide 1.2s infinite ease-in-out;
        }

        @keyframes indeterminate-slide {
            0% {
                left: -30%;
                width: 30%;
            }
            50% {
                left: 35%;
                width: 30%;
            }
            100% {
                left: 100%;
                width: 30%;
            }
        }
    `

    render() {
        return html`
            ${this.value !== undefined
                ? html`<div class="bar" style="width: ${this.value * 100}%;"></div>`
                : html`<div class="indeterminate"></div>`}
        `
    }
}
