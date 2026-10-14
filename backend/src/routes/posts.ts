import { Router } from 'express';
import { listPosts, createPost, updatePost, deletePost } from '../controllers/posts.ts';
import { upload } from '../middlewares/upload.ts';

const router = Router();

router.get('/', listPosts);
router.post('/', upload.array('images', 5), createPost);
router.patch('/:id', updatePost);
router.delete('/:id', deletePost);

export default router;
