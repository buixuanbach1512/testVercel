import axios from 'axios';
axios.defaults.baseURL = 'https://test-vercel-api-sigma.vercel.app/api/';

const getAllColor = async () => {
    const response = await axios.get(`color/`);
    if (response) {
        return response.data;
    }
};

export const colorService = {
    getAllColor,
};
