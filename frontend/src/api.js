import axios from 'axios'

const api = axios.create({ baseURL: '/api/' })

export async function fetchMe() {
	try {
		const res = await api.get('auth/me/')
		return res.data
	} catch (err) {
		return null
	}
}

// Attach JWT token from localStorage if present
api.interceptors.request.use(config => {
	const token = localStorage.getItem('access_token')
	if (token) config.headers['Authorization'] = `Bearer ${token}`
	return config
})

export default api
