export interface InputData {
    title: string
    subTitle?: string
    image?: string // base64 encoded image string or URL
    overlays?: Overlay[]
}

export type Overlay = ProgressOverlay | TextOverlay | SwitchOverlay | HtmlOverlay

interface BaseOverlay {
    layerName: string
    layerType: 'progress' | 'text' | 'switch' | 'html'
    items?: OverlayItem[]
}

interface OverlayItem {
    title: string
    relXPos: number // 0 = left, 0.5 = center, 1 = right
    relYPos: number // 0 = top, 0.5 = center, 1 = bottom
    data: string
}

export interface ProgressOverlay extends BaseOverlay {
    layerType: 'progress'
    progressStyle?: {
        width?: number
        height?: number
        rotate?: number
        backgroundColor?: string // CSS color
    }
    sections?: {
        sectionLimits: number[]
        colors: string[]
    }
}

export interface TextOverlay extends BaseOverlay {
    layerType: 'text'
    textStyle: {
        fontSize?: number
        fontWeight?: number
        precision?: number
        backgroundColor?: string
    }
    sections?: {
        sectionLimits: number[]
        colors: string[]
    }
}

export interface SwitchOverlay extends BaseOverlay {
    layerType: 'switch'
}

export interface HtmlOverlay extends BaseOverlay {
    layerType: 'html'
    componentImplementation?: string // JS import code
    componentUsage?: string // HTML snippet
}

export type Modifier = {
    scaler: number
    xOffset: number
    yOffset: number
    visibleWidth: number
    visibleHeight: number
}
