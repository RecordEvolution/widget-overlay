export interface InputData {
    title: string
    subTitle?: string
    image?: string // base64 encoded image string or URL
    overlays?: Overlay[]
}

export type Overlay = ProgressOverlay | TextOverlay

interface BaseOverlay {
    layerName: string
    layerType: 'progress' | 'text'
    textPins?: TextItem[]
    progressPins?: ProgressItem[]
}

interface TextItem {
    prefix: string
    suffix: string
    relXPos: number // 0 = left, 0.5 = center, 1 = right
    relYPos: number // 0 = top, 0.5 = center, 1 = bottom
    data: string
}

interface ProgressItem {
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

export type Modifier = {
    scaler: number
    xOffset: number
    yOffset: number
    visibleWidth: number
    visibleHeight: number
}
