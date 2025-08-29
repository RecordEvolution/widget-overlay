import { html, css, LitElement, PropertyValues, nothing } from 'lit'
import { property, query, state } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import {
    HtmlOverlay,
    InputData,
    Modifier,
    Overlay,
    OverlayItem,
    ProgressOverlay,
    SwitchOverlay,
    TextOverlay
} from './definition-schema.js'
import { repeat } from 'lit/directives/repeat.js'

type Theme = {
    theme_name: string
    theme_object: any
}
export class WidgetImage extends LitElement {
    @property({ type: Object })
    inputData?: InputData

    @property({ type: Object })
    theme?: Theme

    @state() private themeBgColor?: string
    @state() private themeTitleColor?: string
    @state() private themeSubtitleColor?: string
    @state() private previewUrl?: string
    @state() private inlineSvg?: string

    @state() private modifier?: Modifier

    constructor() {
        super()
        this.getModifier = this.getModifier.bind(this)
    }

    @query('#base-layer')
    private baseLayer!: any

    private renderMap = {
        progress: this.renderProgress.bind(this),
        text: this.renderText.bind(this),
        switch: this.renderSwitch.bind(this),
        html: this.renderHtml.bind(this)
    }

    version: string = 'versionplaceholder'

    update(changedProperties: Map<string, any>) {
        if (changedProperties.has('inputData')) {
            this.transform()
            if (!this.modifier) this.getModifier()
        }
        if (changedProperties.has('theme')) {
            this.registerTheme(this.theme)
        }
        super.update(changedProperties)
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
        this.registerTheme(this.theme)

        const ro = new ResizeObserver(this.getModifier)
        ro.observe(this)
    }

    registerTheme(theme?: Theme) {
        const cssTextColor = getComputedStyle(this).getPropertyValue('--re-text-color').trim()
        const cssBgColor = getComputedStyle(this).getPropertyValue('--re-tile-background-color').trim()
        this.themeBgColor = cssBgColor || this.theme?.theme_object?.backgroundColor
        this.themeTitleColor = cssTextColor || this.theme?.theme_object?.title?.textStyle?.color
        this.themeSubtitleColor =
            cssTextColor || this.theme?.theme_object?.title?.subtextStyle?.color || this.themeTitleColor
    }

    private handleFileChange(ev: Event) {
        const input = ev.target as HTMLInputElement
        const file = input.files?.[0]
        if (!file) return
        // Revoke previous object URL
        if (this.previewUrl) URL.revokeObjectURL(this.previewUrl)
        this.previewUrl = URL.createObjectURL(file)
        this.dispatchEvent(
            new CustomEvent('overlay-file-selected', {
                detail: { file, name: file.name, size: file.size, type: file.type, url: this.previewUrl },
                bubbles: true,
                composed: true
            })
        )
    }

    transform() {
        this.inlineSvg = undefined
        if (!this.inputData?.image) {
            this.previewUrl = undefined
            return
        }
        const raw = this.inputData.image.trim()

        // Dynamically load progress bar element if needed
        if (this.inputData?.overlays?.some((o) => o.layerType === 'progress')) {
            import('./linear-progress.js')
        }

        // Inline SVG markup (optionally starting with an XML declaration or other preamble)
        const trimmed = raw.replace(/^\uFEFF/, '').trimStart()

        // Find the actual <svg ...>...</svg> block even if preceded by <?xml ...?> or <!DOCTYPE ...>
        const svgBlockMatch = trimmed.match(/<svg[\s\S]*?<\/svg>/i)

        if (svgBlockMatch) {
            this.inlineSvg = svgBlockMatch[0].trim()
            this.previewUrl = undefined
            return
        }

        // Full data URL (already encoded)
        if (/^data:image\/svg\+xml[,;]/.test(raw)) {
            // It's an SVG data URL; we could theoretically decode, but safer to keep as src
            this.previewUrl = raw
            return
        }
        if (/^data:image\/[a-zA-Z.+-]+;base64,/.test(raw)) {
            this.previewUrl = raw
            return
        }

        // Bare base64 string (heuristic)
        if (/^[A-Za-z0-9+/]+=*$/.test(raw) && raw.length > 100) {
            this.previewUrl = `data:image/*;base64,${raw}`
            return
        }

        // Absolute URL
        try {
            new URL(raw)
            this.previewUrl = raw
            return
        } catch {
            // Relative path
            if (/^([./]|\/)/.test(raw)) {
                this.previewUrl = raw
                return
            }
        }

        // Fallback
        this.previewUrl = undefined
    }

    private async getModifier() {
        if (!this.baseLayer) return
        const rect = this.baseLayer.getBoundingClientRect()
        if (!rect) return

        const containerRect = this.baseLayer.parentElement?.getBoundingClientRect()
        if (!containerRect) return

        let intrinsicWidth: number | undefined
        let intrinsicHeight: number | undefined

        if (this.baseLayer instanceof HTMLImageElement) {
            // For <img>
            intrinsicWidth = this.baseLayer.naturalWidth
            intrinsicHeight = this.baseLayer.naturalHeight
        } else {
            const innerSvg = this.baseLayer.querySelector('svg')

            if (innerSvg) {
                // For <svg>
                const viewBox = innerSvg.viewBox.baseVal
                console.log(viewBox)
                if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
                    intrinsicWidth = viewBox.width
                    intrinsicHeight = viewBox.height
                } else {
                    // fallback to width/height attributes if set
                    const widthAttr = this.baseLayer.getAttribute('width')
                    const heightAttr = this.baseLayer.getAttribute('height')
                    if (widthAttr && heightAttr) {
                        intrinsicWidth = parseFloat(widthAttr)
                        intrinsicHeight = parseFloat(heightAttr)
                    }
                }
            }
        }

        if (!intrinsicWidth || !intrinsicHeight) return

        // Actual visible area of the image/svg
        const scaleX = rect.width / intrinsicWidth
        const scaleY = rect.height / intrinsicHeight
        const scale = Math.min(scaleX, scaleY)

        const visibleWidth = intrinsicWidth * scale
        const visibleHeight = intrinsicHeight * scale

        const xOffset = (containerRect.width - visibleWidth) / 2
        const yOffset = (containerRect.height - visibleHeight) / 2

        this.modifier = { scaler: scale, xOffset, yOffset, visibleWidth, visibleHeight }
    }

    private getOverlayItemPosition(relX: number, relY: number, modifier: Modifier) {
        return {
            left: modifier.xOffset + relX * modifier.visibleWidth,
            top: modifier.yOffset + relY * modifier.visibleHeight
        }
    }

    renderText(_overlay: Overlay, item: OverlayItem, modifier: Modifier) {
        const overlay = _overlay as TextOverlay
        const pos = this.getOverlayItemPosition(item.relXPos, item.relYPos, modifier)
        if (!pos) return nothing

        const precision = overlay.textStyle?.precision ?? 1
        let value = item.data
        const numericValue = Number(value)
        let color = '#333'
        if (!Number.isNaN(numericValue)) {
            if (typeof precision === 'number' && precision >= 0) {
                value = numericValue.toFixed(precision)
                const sectionIndex =
                    overlay.sections?.sectionLimits.findIndex((limit) => numericValue <= limit) ?? -2
                color = (sectionIndex >= 1 ? overlay.sections?.colors[sectionIndex - 1] : '#333') ?? '#333'
            }
        }

        const styles = {
            'font-size': (overlay.textStyle.fontSize ?? 14) * modifier.scaler + 'px',
            color,
            'background-color': overlay.textStyle.backgroundColor,
            'font-weight': overlay.textStyle.fontWeight,
            left: `${pos.left}px`,
            top: `${pos.top}px`,
            'border-radius': 10 * modifier.scaler + 'px',
            'transform-origin': '50% 50%',
            transform: `translate(-50%, -50%)`,
            padding: `${6 * modifier.scaler}px ${12 * modifier.scaler}px`
        }

        return html` <div class="overlay-item" style=${styleMap(styles)}>${item.title} ${value}</div> `
    }

    renderProgress(_overlay: Overlay, item: OverlayItem, modifier: Modifier) {
        const overlay = _overlay as ProgressOverlay
        const pos = this.getOverlayItemPosition(item.relXPos, item.relYPos, modifier)
        if (!pos) return nothing

        const sectionIndex =
            overlay.sections?.sectionLimits.findIndex((limit) => Number(item.data) <= limit) ?? -2
        const sectionColor = sectionIndex >= 1 ? overlay.sections?.colors[sectionIndex - 1] : undefined
        const styles = {
            '--progress-color': sectionColor ?? '#333',
            '--progress-width': (overlay.progressStyle?.width ?? 10) * modifier.scaler + 'px',
            '--progress-height': (overlay.progressStyle?.height ?? 100) * modifier.scaler + 'px',
            '--progress-background': overlay.progressStyle?.backgroundColor ?? '#fff',
            'border-radius': 10 * modifier.scaler + 'px',
            'transform-origin': '50% 50%',
            transform: `translate(-50%, -50%) rotate(${overlay.progressStyle?.rotate ?? 0}deg)`,
            left: `${pos.left}px`,
            top: `${pos.top}px`
        }
        // Derive percentage based on item.data within overlay.sections min/max.
        // Supports several possible property names; falls back to sectionLimits array.
        const rawValue = Number(item.data)
        const sections: any = overlay.sections ?? {}
        const min = Math.min(...sections.sectionLimits.map(Number))
        const max = Math.max(...sections.sectionLimits.map(Number))
        let percent = max === min ? 0 : (rawValue - min) / (max - min)
        percent = Math.min(1, Math.max(0, percent))
        // percent now holds the normalized 0-100 percentage for rawValue
        return html` <linear-progress .value=${percent} style=${styleMap(styles)}></linear-progress> `
    }

    renderHtml(_overlay: Overlay, item: OverlayItem, modifier: Modifier) {
        return html` <div>${item.title}: ${item.data}</div> `
    }

    renderSwitch(_overlay: Overlay, item: OverlayItem, modifier: Modifier) {
        return html` <div>${item.title}: ${item.data}</div> `
    }

    renderLayer(overlay: Overlay) {
        const modifier = this.modifier
        if (!modifier) return nothing
        return html` ${repeat(
            overlay.items ?? [],
            (item) => item.title,
            (item) => {
                return html` ${this.renderMap[overlay.layerType](overlay, item, modifier)} `
            }
        )}`
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

        .svg-wrapper {
            width: 100%;
            height: 100%;
            overflow: hidden;
            position: relative;
        }

        .svg-wrapper svg {
            width: 100%;
            height: 100%;
            display: block;
            /* preserveAspectRatio inside SVG handles "contain"-like scaling */
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
            position: relative;
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

        .overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
        }

        .overlay-item {
            position: absolute;
            pointer-events: auto;
        }
    `

    render() {
        const hasImage = !!this.inlineSvg || !!this.previewUrl
        return html`
            <div class="wrapper" style="background-color: ${this.themeBgColor}">
                <h3 class="paging" ?active=${this.inputData?.title} style="color: ${this.themeTitleColor}">
                    ${this.inputData?.title}
                </h3>
                <p
                    class="paging"
                    ?active=${this.inputData?.subTitle}
                    style="color: ${this.themeSubtitleColor}"
                >
                    ${this.inputData?.subTitle}
                </p>

                <div class="paging no-data" ?active=${!hasImage}>No Image</div>
                <div class="img-container paging" ?active="${hasImage}">
                    ${this.inlineSvg
                        ? html`<div id="base-layer" class="svg-wrapper">${unsafeSVG(this.inlineSvg)}</div>`
                        : this.previewUrl
                          ? html`<img
                                id="base-layer"
                                @load="${this.getModifier}"
                                src="${this.previewUrl}"
                                alt="Image Widget"
                            />`
                          : ''}
                    ${repeat(
                        this.inputData?.overlays ?? [],
                        (o) => o.layerName,
                        (o) => html`
                            <div class="overlay" type="${o.layerType}" name="${o.layerName}">
                                ${this.renderLayer(o)}
                            </div>
                        `
                    )}
                </div>
            </div>
        `
    }
}
window.customElements.define('widget-overlay-versionplaceholder', WidgetImage)
