// src/components/DescriptionModal.jsx
import PropTypes from 'prop-types';

function EditModal({ isOpen, onClose, onSave, description, onDescriptionChange }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay fixed top-0 left-0 w-100 h-100 bg-black-20 flex justify-center align-center">
      <div className="modal-content pa3">
        <h2 className="ma0 pb3">Edit Info Text</h2>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={15}
          cols={50}
        />
        <div className="pt3">
          <button className="mr2" onClick={onSave}>Save</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

EditModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  description: PropTypes.string.isRequired,
  onDescriptionChange: PropTypes.func.isRequired,
};

export default EditModal;
