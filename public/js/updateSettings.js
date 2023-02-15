import axios from 'axios';
import { showAlert } from './alerts';

// "type" is either password or other data
export const updateSettings = async (type, data) => {
    try {
        const url = type === 'password'
            ? '/api/v1/users/updateMyPassword'
            : '/api/v1/users/updateMe';

        const response = await axios({
            method: 'PATCH',
            url,
            data
        });

        if (response.data.status === 'success') {
            showAlert('success', `Updated ${type.toUpperCase()} successfully!`);
        }
    } catch (err) {
        showAlert('error', err.response.data.message);
    }
}