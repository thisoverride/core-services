import axios, { AxiosResponse } from "axios";

export interface AvailableCamerasResponse {
    available_cameras: CameraInfo[];
}

export interface CameraInfo {
    model: string;
    name: string;
    port: number;
}

export interface CameraData {
    model_name: string;
    resolution: Resolution;
}

export interface Resolution {
    height: number;
    width: number;
}

export default class FaceCamera {

    private static readonly BASE_URL: string = "http://127.0.0.1:3000/api/v1/myself";
    
    private static getUrl(path: string): string {
        return `${FaceCamera.BASE_URL}${path}`;
    }

    public static async getCameraImage(): Promise<string> {
        try {
            const response: AxiosResponse<string> = await axios.get(
                FaceCamera.getUrl("/camera/lens")
            );
            return response.data;
        } catch (error) {
            console.error("Erreur lors de la récupération de l'image de la caméra :", error);
            throw error;
        }
    }

    public static async getCameraInfo(): Promise<CameraData> {
        try {
            const response: AxiosResponse<CameraData> = await axios.get(
                FaceCamera.getUrl("/camera/info")
            );
            return response.data;
        } catch (error) {
            console.error("Erreur lors de la récupération des informations de la caméra :", error);
            throw error;
        }
    }

    public static async getCameraList(): Promise<AvailableCamerasResponse> {
        try {
            const response: AxiosResponse<AvailableCamerasResponse> = await axios.get(
                FaceCamera.getUrl("/camera/list")
            );
            return response.data;
        } catch (error) {
            console.error("Erreur lors de la récupération des informations de la caméra :", error);
            throw error;
        }
    }

    public static async getChangeCamera(port: number): Promise<any> {
        try {
            const response: AxiosResponse<any> = await axios.post(
                FaceCamera.getUrl("/camera/change"),
                { index: port }
            );
            return response.data;
        } catch (error) {
            console.error("Erreur lors de la récupération des informations de la caméra :", error);
            throw error;
        }
    }

    public static async releaseCamera(): Promise<any> {
        try {
            const response: AxiosResponse<any> = await axios.get(
                FaceCamera.getUrl("/camera/release"));
            return response.data;
        } catch (error) {
            console.error("Erreur lors de la récupération des informations de la caméra :", error);
            throw error;
        }
    }

    public static async disconnect(): Promise<any> {
        try {
            const response: AxiosResponse<any> = await axios.get(
                FaceCamera.getUrl("/camera/disconnect"));
            return response.data;
        } catch (error) {
            console.error("Erreur lors de la récupération des informations de la caméra :", error);
            throw error;
        }
    }
}
