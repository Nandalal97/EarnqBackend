const Subject = require('../models/Subject');
const Category = require('../models/Category');

const createSubject = async (req, res) => {
  try {
    const { subjectName, categoryId, createdBy } = req.body;

    if (!subjectName || !categoryId || !createdBy) {
      return res.status(400).json({ status: 0, msg: "subjectName, categoryId, and createdBy are required" });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ status: 0, msg: "Category not found" });
    }

    const existingSubjects = await Subject.find({ categoryId });

    const isDuplicate = existingSubjects.some(existing => {
      const existingNames = existing.subjectName; // Mongoose Map
      return Object.keys(subjectName).some(lang =>
        existingNames.get(lang)?.trim().toLowerCase() === subjectName[lang].trim().toLowerCase()
      );
    });

    if (isDuplicate) {
      return res.status(409).json({ status: 0, msg: "Subject already exists in this category" });
    }

    const newSubject = new Subject({
      subjectName,
      categoryId,
      createdBy
    });

    await newSubject.save();
    res.status(201).json({ status: 1, msg: "Subject Added Successfully" });

  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};


// Get Single Subject
const getSingleSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({ status: 0, msg: "Subject not found" });
    }
    res.json({
      _id: subject._id,
      subjectName: subject.subjectName,
      createdBy: subject.createdBy,
      categoryId:subject.categoryId
    });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch subject',
      error: err.message,
    });
  }
};


// Edit Subject
const editSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { subjectName, categoryId } = req.body;

    if (!subjectName || !categoryId) {
      return res.status(400).json({ status: 0, msg: "subjectName and categoryId are required" });
    }

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({ status: 0, msg: "Subject not found" });
    }

    subject.subjectName = subjectName;
    subject.categoryId = categoryId;

    await subject.save();

    res.status(200).json({ status: 1, msg: "Subject updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Delete Subject
const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({ status: 0, msg: "Subject not found" });
    }

    await Subject.deleteOne({ _id: id });

    res.status(200).json({ status: 1, msg: "Subject deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};



// Get Subjects Grouped by Category(for frontend)
// controller: getSubjectsGroupedByCategory
const getSubjectsGroupedByCategory = async (req, res) => {
  try {
   const allowedLangs = ['en', 'hi', 'ta', 'te', 'gu', 'kn', 'pa', 'bn', 'or', 'mr'];
const rawLang = (req.query && req.query.lang) ? req.query.lang.toLowerCase() : 'en';
const lang = allowedLangs.includes(rawLang) ? rawLang : 'en';


    const grouped = await Subject.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "categoryData"
        }
      },
      { $unwind: "$categoryData" },
      {
        $group: {
          _id: {
            categoryId: "$categoryId",
            categoryNameLocalized: {
              $ifNull: [
                {
                  $getField: {
                    field: lang,
                    input: "$categoryData.categoryName"
                  }
                },
                {
                  $getField: {
                    field: "en",
                    input: "$categoryData.categoryName"
                  }
                }
              ]
            },
            categoryNameEnglish: {
              $getField: {
                field: "en",
                input: "$categoryData.categoryName"
              }
            }
          },
          subjects: {
            $push: {
              id: "$_id",
              name: {
                $ifNull: [
                  {
                    $getField: {
                      field: lang,
                      input: "$subjectName"
                    }
                  },
                  {
                    $getField: {
                      field: "en",
                      input: "$subjectName"
                    }
                  }
                ]
              },
              name_en: {
                $getField: {
                  field: "en",
                  input: "$subjectName"
                }
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          category_id: "$_id.categoryId",
          category: "$_id.categoryNameLocalized",
          category_en: "$_id.categoryNameEnglish",
          subjects: 1
        }
      },
      {
        $sort: { category: 1 }
      }
    ]);

    res.status(200).json(grouped);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Get All Subjects with Category Name
const getAllSubjectsWithCategory = async (req, res) => {
  try {
    const subjects = await Subject.find()
      .populate('categoryId')
      .sort({ createdAt: -1 });

    const formatted = subjects.map(sub => ({
      _id: sub._id,
      subjectName: sub.subjectName?.get('en') || '',
      categoryId: sub.categoryId?._id || '',
      categoryName: sub.categoryId?.categoryName?.get('en') || '',
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  createSubject,
  editSubject,
  deleteSubject,
  getSingleSubject,
  getSubjectsGroupedByCategory,
  getAllSubjectsWithCategory
};
