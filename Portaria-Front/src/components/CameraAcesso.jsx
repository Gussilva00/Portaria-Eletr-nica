import Webcam from "react-webcam";
import { useRef, useCallback } from "react";
import api from '../services/api';

const CameraAcesso = ({ aoCapturar, onDetected, modo, webcamRef: externalWebcamRef }) => {
  const internalWebcamRef = useRef(null);
  const webcamRef = externalWebcamRef || internalWebcamRef;

  const capturar = useCallback(async () => {
    if (!webcamRef.current) {
      console.warn('Webcam ainda não está pronta');
      return;
    }

    const imagemSrc = webcamRef.current.getScreenshot();
    console.log('Imagem capturada:', imagemSrc ? 'OK' : 'FALHA');
    if (!imagemSrc) {
      console.warn('Nenhuma imagem obtida da webcam');
      return;
    }

    if (aoCapturar) aoCapturar(imagemSrc); // Envia a foto para o componente pai

    // Enviar para reconhecimento
    try {
      console.log('Enviando para reconhecimento...');
      const response = await api.post('/api/recognize', { image: imagemSrc });
      console.log('Resposta do reconhecimento:', response.data);

      const detected = {
        id: response.data?.id ?? response.data?.user_id ?? null,
        name: response.data?.name ?? response.data?.user_name ?? null
      };

      if ((detected.id || detected.name) && onDetected) {
        console.log('Pessoa detectada:', detected);
        onDetected(detected);
      } else {
        console.log('Nenhuma pessoa detectada');
      }
    } catch (error) {
      console.error('Erro no reconhecimento:', error);
      console.error('Detalhes do erro:', error?.response?.data ?? error.message);
    }
  }, [webcamRef, aoCapturar, onDetected]);

  return (
    <div className="camera-container">
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={{ width: 400, height: 300, facingMode: "user" }}
      />
      {modo !== 'auto' && (
        <button onClick={capturar} className="btn-camera">
          Capturar Rosto
        </button>
      )}
    </div>
  );
};

export default CameraAcesso;