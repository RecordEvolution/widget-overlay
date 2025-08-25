import { html, css, LitElement, PropertyValues } from 'lit'
import { property, state } from 'lit/decorators.js'
import { ConfigureTheImage } from './definition-schema.js'
type Theme = {
    theme_name: string
    theme_object: any
}
export class WidgetImage extends LitElement {
    @property({ type: Object })
    inputData?: ConfigureTheImage

    @property({ type: Object })
    theme?: Theme

    @state() private themeBgColor?: string
    @state() private themeTitleColor?: string
    @state() private themeSubtitleColor?: string

    version: string = 'versionplaceholder'

    update(changedProperties: Map<string, any>) {
        if (changedProperties.has('theme')) {
            this.registerTheme(this.theme)
        }

        super.update(changedProperties)
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
        this.registerTheme(this.theme)
    }

    registerTheme(theme?: Theme) {
        const cssTextColor = getComputedStyle(this).getPropertyValue('--re-text-color').trim()
        const cssBgColor = getComputedStyle(this).getPropertyValue('--re-tile-background-color').trim()
        this.themeBgColor = cssBgColor || this.theme?.theme_object?.backgroundColor
        this.themeTitleColor = cssTextColor || this.theme?.theme_object?.title?.textStyle?.color
        this.themeSubtitleColor =
            cssTextColor || this.theme?.theme_object?.title?.subtextStyle?.color || this.themeTitleColor
    }

    static styles = css`
        :host {
            display: block;
            font-family: sans-serif;
            box-sizing: border-box;
            margin: auto;
        }

        .paging:not([active]) {
            display: none !important;
        }

        .wrapper {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            padding: 16px;
            box-sizing: border-box;
        }

        h3 {
            margin: 0;
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        p {
            margin: 10px 0 0 0;
            max-width: 300px;
            font-size: 14px;
            line-height: 17px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .img-container {
            flex: 1;
            box-sizing: border-box;
            overflow: hidden;
        }

        img {
            width: 100%; /* Set the width of the container */
            height: 100%;
            object-fit: contain;
        }
        .no-data {
            font-size: 20px;
            display: flex;
            height: 100%;
            width: 100%;
            text-align: center;
            align-items: center;
            justify-content: center;
        }
    `

    render() {
        return html`
            <div class="wrapper" style="background-color: ${this.themeBgColor}">
                <h3
                    class="paging"
                    ?active=${this.inputData?.title?.text}
                    style="font-size: ${this.inputData?.title?.fontSize}; 
                        font-weight: ${this.inputData?.title?.fontWeight}; 
                        background-color: ${this.inputData?.title?.backgroundColor};
                        color: ${this.inputData?.title?.color ?? this.themeTitleColor};"
                >
                    ${this.inputData?.title?.text}
                </h3>
                <p
                    class="paging"
                    ?active=${this.inputData?.subTitle?.text}
                    style="font-size: ${this.inputData?.subTitle?.fontSize}; 
                        font-weight: ${this.inputData?.subTitle?.fontWeight}; 
                        color: ${this.inputData?.subTitle?.color ?? this.themeSubtitleColor};"
                >
                    ${this.inputData?.subTitle?.text}
                </p>
                <div
                    class="paging no-data"
                    ?active=${!this.inputData?.imageLink}
                    style="font-size: ${this.inputData?.title?.fontSize}; 
                        font-weight: ${this.inputData?.title?.fontWeight}; 
                        color: ${this.inputData?.title?.color ?? this.themeTitleColor};"
                >
                    No Image
                </div>
                <div class="img-container paging" ?active="${this.inputData?.imageLink}">
                    <img src="${this.inputData?.imageLink ?? ''}" alt="Image Widget" />
                </div>
            </div>
        `
    }
}
window.customElements.define('widget-overlay-versionplaceholder', WidgetImage)
