const cloudinary = require("../config/cloudinary");
const Lesson = require("../models/Lesson");

const parseAndValidateSyllabus = (syllabusRaw) => {
  if (!syllabusRaw) return [];
  const parsed = Array.isArray(syllabusRaw)
    ? syllabusRaw
    : JSON.parse(syllabusRaw || "[]");

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid syllabus format: must be an array");
  }

  parsed.forEach((item) => {
    if (!item.title || !item.description) {
      throw new Error("Each syllabus item must have a title and description.");
    }
  });

  return parsed;
};

const handleThumbnailUpload = async (course, file) => {
  if (!file) return course?.thumbnail || null;

  const uploadResponse = await cloudinary.uploader.upload(file.path, {
    folder: "course_thumbnails",
  });

  if (course?.thumbnail) {
    try {
      const oldPublicId = course.thumbnail.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`course_thumbnails/${oldPublicId}`);
    } catch (err) {
      console.error("Failed to delete old thumbnail:", err);
    }
  }

  return uploadResponse.secure_url;
};

const processLessonVideos = async (course, files, lessonUpdatesRaw) => {
  if (!files?.lessonVideos) return;

  const videoFiles = files.lessonVideos;
  const lessonUpdates = Array.isArray(lessonUpdatesRaw)
    ? lessonUpdatesRaw
    : JSON.parse(lessonUpdatesRaw || "[]");

  for (let i = 0; i < lessonUpdates.length; i++) {
    const lessonUpdate = lessonUpdates[i];
    const { _id, title, description } = lessonUpdate;
    let newVideoUrl = null;

    if (videoFiles[i]) {
      const uploadResponse = await cloudinary.uploader.upload(videoFiles[i].path, {
        resource_type: "video",
        folder: "lesson_videos",
      });
      newVideoUrl = uploadResponse.secure_url;

      if (_id) {
        const lesson = await Lesson.findById(_id);
        if (lesson && lesson.videoUrl) {
          try {
            const oldPublicId = lesson.videoUrl.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`lesson_videos/${oldPublicId}`, {
              resource_type: "video",
            });
          } catch (err) {
            console.error("Failed to delete old video:", err);
          }
        }
      }
    }

    if (_id) {
      await Lesson.findByIdAndUpdate(_id, {
        title,
        description,
        videoUrl: newVideoUrl || lessonUpdate.videoUrl,
      });
    } else {
      const newLesson = new Lesson({
        course: course._id,
        title,
        description,
        videoUrl: newVideoUrl,
      });
      await newLesson.save();
      course.lessons.push(newLesson._id);
    }
  }
};

module.exports = {
  parseAndValidateSyllabus,
  handleThumbnailUpload,
  processLessonVideos,
};
